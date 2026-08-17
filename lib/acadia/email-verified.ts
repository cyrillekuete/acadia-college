/**
 * Acadia provisions accounts already confirmed. Users are not asked to verify email.
 */
export function isAcadiaEmailVerified(
  _emailVerifiedAt?: string | Date | boolean | null,
): boolean {
  return true;
}

/** Timestamp written onto `User.emailVerifiedAt` when an account is created. */
export function acadiaEmailVerifiedAt(now: string | Date = new Date()): string {
  return now instanceof Date ? now.toISOString() : now;
}
