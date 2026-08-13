import { formatPhoneForDisplay } from '@/lib/acadia/phone';
import { getUiLocale, localizedText, translate } from '@/lib/acadia/locale';

export { streamLabel } from '@/lib/acadia/education-system';

export function formatRecordValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value
      ? translate('common.labels.yes', { defaultValue: 'Yes' })
      : translate('common.labels.no', { defaultValue: 'No' });
  }
  if (typeof value === 'object') {
    return '—';
  }
  const text = String(value).trim();
  return text.length > 0 ? text : '—';
}

export function formatPhoneRecordValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  const text = String(value).trim();
  if (!text) {
    return '—';
  }
  return formatPhoneForDisplay(text) || text;
}

export function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return formatRecordValue(value);
  }
  return date.toLocaleString();
}

/** Unwrap Supabase embedded relation (object or single-element array). */
export function unwrapRelation<T extends Record<string, unknown>>(
  value: unknown,
): T | null {
  if (!value) {
    return null;
  }
  const row = Array.isArray(value) ? value[0] : value;
  if (row && typeof row === 'object') {
    return row as T;
  }
  return null;
}

export function levelLabel(level: {
  number?: number;
  name?: string;
  labelEn?: string | null;
  labelFr?: string | null;
} | null): string {
  if (!level) {
    return '—';
  }
  const name =
    localizedText(level.labelEn, level.labelFr, getUiLocale()) ||
    level.name?.trim();
  if (name) {
    return name;
  }
  if (level.number !== undefined) {
    return translate('catalog.levelN', {
      number: level.number,
      defaultValue: `Level ${level.number}`,
    });
  }
  return '—';
}

export function formatSubjectLevelsLabel(
  primary: { number?: number; name?: string; labelEn?: string | null } | null,
  extra: { number?: number; name?: string; labelEn?: string | null }[],
): string {
  const labels: string[] = [];
  const primaryLabel = levelLabel(primary);
  if (primaryLabel !== '—') {
    labels.push(primaryLabel);
  }
  for (const level of extra) {
    const label = levelLabel(level);
    if (label !== '—' && !labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels.length > 0 ? labels.join(', ') : '—';
}

export function termLabel(term: { number?: number } | null): string {
  if (!term || term.number === undefined) {
    return '—';
  }
  return translate('catalog.termN', {
    number: term.number,
    defaultValue: `Term ${term.number}`,
  });
}

export function subjectTermScopeLabel(
  term: { number?: number } | null,
  termId: string | null | undefined,
): string {
  if (!termId) {
    return translate('catalog.allTerms', { defaultValue: 'All terms' });
  }
  return termLabel(term);
}

/** @deprecated Use {@link termLabel} */
export const semesterLabel = termLabel;

export function sequenceLabel(
  sequence: { number?: number; numberInTerm?: number } | null,
): string {
  if (!sequence || sequence.number === undefined) {
    return '—';
  }
  if (sequence.numberInTerm !== undefined) {
    return translate('catalog.sequenceInTerm', {
      number: sequence.number,
      numberInTerm: sequence.numberInTerm,
      defaultValue: `Sequence ${sequence.number} (term seq. ${sequence.numberInTerm})`,
    });
  }
  return translate('catalog.sequenceN', {
    number: sequence.number,
    defaultValue: `Sequence ${sequence.number}`,
  });
}

export function formatStringArray(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return '—';
  }
  return value.map(String).join(', ');
}

export function apiKeyStatus(
  revokedAt: string | null | undefined,
  expiresAt: string | null | undefined,
): 'active' | 'revoked' | 'expired' {
  if (revokedAt) {
    return 'revoked';
  }
  if (expiresAt) {
    const expires = new Date(expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()) {
      return 'expired';
    }
  }
  return 'active';
}
