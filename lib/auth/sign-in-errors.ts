import type { AuthError } from '@supabase/supabase-js';

/** User-safe copy for Supabase Auth sign-in failures. */
export function normalizeSignInError(error: AuthError | Error): string {
  const message = error.message.toLowerCase();

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password')
  ) {
    return 'Incorrect email or password.';
  }

  if (message.includes('email not confirmed')) {
    return 'This account is not ready to sign in. Contact an administrator.';
  }

  if (message.includes('too many requests') || message.includes('rate limit')) {
    return 'Too many sign-in attempts. Please wait a moment and try again.';
  }

  if (message.includes('user banned') || message.includes('disabled')) {
    return 'This account has been disabled. Contact an administrator.';
  }

  if (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed')
  ) {
    return 'Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local matches your Supabase project (Settings → API) and that the project is active.';
  }

  return 'Unable to sign in. Please try again.';
}
