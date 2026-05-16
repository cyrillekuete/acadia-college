export function formatRecordValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object') {
    return '—';
  }
  const text = String(value).trim();
  return text.length > 0 ? text : '—';
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

export function specialtyLabel(
  specialty: { code?: string; nameEn?: string } | null,
): string {
  if (!specialty) {
    return '—';
  }
  const code = specialty.code?.trim();
  const name = specialty.nameEn?.trim();
  if (code && name) {
    return `${code} — ${name}`;
  }
  return code || name || '—';
}

export function levelLabel(level: { number?: number } | null): string {
  if (!level || level.number === undefined) {
    return '—';
  }
  return `Level ${level.number}`;
}

export function semesterLabel(semester: { number?: number } | null): string {
  if (!semester || semester.number === undefined) {
    return '—';
  }
  return `Semester ${semester.number}`;
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
