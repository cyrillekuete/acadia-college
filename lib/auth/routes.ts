import { getSafeRedirectPath } from '@/lib/auth/safe-redirect-path';

export const SIGN_IN_PATH = '/signin';

/** Paths that do not require a Supabase session (middleware + client guards). */
export const PUBLIC_AUTH_PATHS = [
  '/signin',
  '/signup',
  '/reset-password',
  '/change-password',
  '/verify-email',
  '/auth/callback',
] as const;

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function requiresSupabaseSession(pathname: string): boolean {
  if (pathname.startsWith('/api/')) {
    return false;
  }
  if (isPublicAuthPath(pathname)) {
    return false;
  }
  return true;
}

export function buildSignInUrl(next?: string | null): string {
  const safeNext = next ? getSafeRedirectPath(next, '') : '';
  if (!safeNext) {
    return SIGN_IN_PATH;
  }
  const params = new URLSearchParams({ next: safeNext });
  return `${SIGN_IN_PATH}?${params.toString()}`;
}

export function buildRequestPath(
  pathname: string,
  search: string,
): string {
  return search ? `${pathname}?${search}` : pathname;
}
