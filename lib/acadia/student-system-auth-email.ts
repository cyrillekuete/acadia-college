import { buildSystemLoginEmail } from '@/lib/acadia/system-login-email';

/** Legacy domain retained only for recognizing addresses during migration. */
export const STUDENT_SYSTEM_AUTH_EMAIL_DOMAIN = 'student.acadia.local';

/** Backwards-compatible name for the generated student login format. */
export function buildStudentSystemAuthEmail(
  firstName: string,
  lastName: string,
): string {
  return buildSystemLoginEmail(`${firstName} ${lastName}`);
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
