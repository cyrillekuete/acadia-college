import { translate } from '@/lib/acadia/locale';

export const TENANT_PROFILE_EDITABLE_FIELDS = [
  'displayNameEn',
  'displayNameFr',
  'institutionEmail',
  'institutionPhone',
  'websiteUrl',
  'addressLine1',
  'addressLine2',
  'city',
  'region',
  'country',
  'secondaryContactName',
  'secondaryContactEmail',
  'primaryColor',
  'accentColor',
  'customDomain',
] as const;

export type TenantProfileField = (typeof TENANT_PROFILE_EDITABLE_FIELDS)[number];

export type TenantProfilePatch = Partial<Record<TenantProfileField, string | null>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DOMAIN_PATTERN =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

const REQUIRED_FIELDS = new Set<TenantProfileField>(['displayNameEn', 'displayNameFr']);

export function isTenantProfileField(field: string): field is TenantProfileField {
  return (TENANT_PROFILE_EDITABLE_FIELDS as readonly string[]).includes(field);
}

function errorMessage(key: string, defaultValue: string): string {
  return translate(key, { defaultValue });
}

function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function parseTenantProfileField(
  field: string,
  raw: string,
): { error: string } | { field: TenantProfileField; value: string | null } {
  if (!isTenantProfileField(field)) {
    return {
      error: errorMessage(
        'errors.invalidInput',
        'Invalid input. Please check your data and try again.',
      ),
    };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    if (REQUIRED_FIELDS.has(field)) {
      return {
        error: errorMessage('validation.required.generic', 'This field is required.'),
      };
    }
    return { field, value: null };
  }

  if (trimmed.length > 200) {
    return {
      error: errorMessage('errors.invalidInput', 'Invalid input. Please check your data and try again.'),
    };
  }

  if (field === 'institutionEmail' || field === 'secondaryContactEmail') {
    if (!EMAIL_PATTERN.test(trimmed)) {
      return {
        error: errorMessage('validation.email', 'Please enter a valid email address.'),
      };
    }
    return { field, value: trimmed.toLowerCase() };
  }

  if (field === 'websiteUrl') {
    const url = normalizeWebsiteUrl(trimmed);
    try {
      new URL(url);
    } catch {
      return { error: errorMessage('validation.url', 'Must be a valid URL.') };
    }
    return { field, value: url };
  }

  if (field === 'primaryColor' || field === 'accentColor') {
    if (!HEX_COLOR_PATTERN.test(trimmed)) {
      return {
        error: errorMessage('validation.hexColor', 'Use a hex color like #C59434.'),
      };
    }
    return { field, value: trimmed.toUpperCase() };
  }

  if (field === 'customDomain') {
    const host = trimmed.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!DOMAIN_PATTERN.test(host)) {
      return {
        error: errorMessage('validation.domain', 'Enter a domain such as school.example.com.'),
      };
    }
    return { field, value: host.toLowerCase() };
  }

  return { field, value: trimmed };
}

export function buildTenantProfilePatch(
  field: string,
  raw: string,
): { error: string } | TenantProfilePatch {
  const parsed = parseTenantProfileField(field, raw);
  if ('error' in parsed) {
    return parsed;
  }
  return { [parsed.field]: parsed.value };
}
