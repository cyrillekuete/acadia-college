import type { AuthError, SupabaseClient, User } from '@supabase/supabase-js';

const STALE_REFRESH_TOKEN_CODES = new Set([
  'refresh_token_not_found',
  'invalid_refresh_token',
]);

/** True when Supabase Auth rejects a stored refresh token (expired, revoked, or missing). */
export function isStaleRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const authError = error as AuthError;
  if (authError.code && STALE_REFRESH_TOKEN_CODES.has(authError.code)) {
    return true;
  }

  const message =
    'message' in authError && typeof authError.message === 'string'
      ? authError.message.toLowerCase()
      : '';

  return (
    message.includes('refresh token not found') ||
    message.includes('invalid refresh token')
  );
}

/** Clears local Supabase session state without surfacing stale-token errors. */
export async function clearStaleSupabaseSession(
  supabase: SupabaseClient,
): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Stale cleanup is best-effort; ignore sign-out failures.
  }
}

/**
 * Resolves the current user, silently clearing storage when refresh tokens are invalid.
 */
export async function getSupabaseUserOrClearStaleSession(
  supabase: SupabaseClient,
): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && isStaleRefreshTokenError(error)) {
    await clearStaleSupabaseSession(supabase);
    return null;
  }

  return user;
}
