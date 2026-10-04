export const SYSTEM_LOGIN_EMAIL_DOMAIN = 'acadia.com';

/** Normalize a name token for use in an Acadia login email. */
export function slugifyLoginNamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');
}

/** Use the first and final non-empty name tokens (given name and surname). */
export function buildSystemLoginEmailLocalPart(fullName: string): string {
  const names = fullName.trim().split(/\s+/).filter(Boolean);
  if (names.length === 0) return 'user';

  const first = slugifyLoginNamePart(names[0] ?? '');
  const last = slugifyLoginNamePart(
    names.length > 1 ? (names[names.length - 1] ?? '') : '',
  );
  const parts = [first, last].filter(Boolean);
  return parts.join('.') || 'user';
}

export function buildSystemLoginEmail(fullName: string, suffix = 1): string {
  const localPart = buildSystemLoginEmailLocalPart(fullName);
  const uniqueLocalPart = suffix > 1 ? `${localPart}.${suffix}` : localPart;
  return `${uniqueLocalPart}@${SYSTEM_LOGIN_EMAIL_DOMAIN}`;
}

/** Resolve a unique address using a caller-provided check against all login identities. */
export async function resolveSystemLoginEmail(
  fullName: string,
  isTaken: (email: string) => Promise<boolean>,
): Promise<string> {
  for (let suffix = 1; suffix < 10_000; suffix += 1) {
    const email = buildSystemLoginEmail(fullName, suffix);
    if (!(await isTaken(email))) return email;
  }
  throw new Error('Unable to generate a unique Acadia login email.');
}

/** Keep an entered contact email as the login; generate one only when blank. */
export async function resolveContactOrSystemLoginEmail(
  contactEmail: string | null | undefined,
  fullName: string,
  isTaken: (email: string) => Promise<boolean>,
): Promise<string> {
  const supplied = contactEmail?.trim().toLowerCase() ?? '';
  return supplied || resolveSystemLoginEmail(fullName, isTaken);
}
