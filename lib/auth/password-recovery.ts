import type { SupabaseClient } from '@supabase/supabase-js';
import { buildPasswordRecoveryRedirectUrl } from '@/lib/auth/app-origin';

export type SendPasswordRecoveryResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Sends a Supabase password recovery email that lands on /change-password via /auth/callback.
 */
export async function sendPasswordRecoveryEmail(
  admin: SupabaseClient,
  email: string,
  origin?: string,
): Promise<SendPasswordRecoveryResult> {
  const redirectTo = buildPasswordRecoveryRedirectUrl(origin);
  const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
