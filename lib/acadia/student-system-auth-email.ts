/** Domain used for synthetic student login emails when no contact email is provided. */
export const STUDENT_SYSTEM_AUTH_EMAIL_DOMAIN = 'student.acadia.local';

export function buildStudentSystemAuthEmail(
  tenantId: string,
  uniqueKey: string,
): string {
  return `student.${tenantId}.${uniqueKey}@${STUDENT_SYSTEM_AUTH_EMAIL_DOMAIN}`;
}

/** True when the address is a synthetic system login, not a real contact email. */
export function isStudentSystemAuthEmail(email: string | null | undefined): boolean {
  const trimmed = email?.trim().toLowerCase() ?? '';
  if (!trimmed) {
    return false;
  }
  return trimmed.endsWith(`@${STUDENT_SYSTEM_AUTH_EMAIL_DOMAIN}`);
}

/**
 * Contact-facing display value for admins.
 * Synthetic system logins are hidden so UUID-style addresses never appear as "email".
 */
export function formatStudentEmailForDisplay(
  email: string | null | undefined,
): string {
  const trimmed = email?.trim() ?? '';
  if (!trimmed || isStudentSystemAuthEmail(trimmed)) {
    return '—';
  }
  return trimmed;
}
