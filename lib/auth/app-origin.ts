/**
 * Canonical application origin for auth redirects (password recovery, email links).
 * Prefer NEXT_PUBLIC_APP_URL in production.
 */
export function getAppOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_BASE_PATH,
    process.env.NEXTAUTH_URL,
    'http://localhost:3000',
  ];

  for (const value of candidates) {
    if (!value) continue;
    return value.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}

/** Supabase redirect target after the user clicks a password recovery email link. */
export function buildPasswordRecoveryRedirectUrl(origin?: string): string {
  const base = origin ?? getAppOrigin();
  const next = encodeURIComponent('/change-password');
  return `${base}/auth/callback?next=${next}`;
}
