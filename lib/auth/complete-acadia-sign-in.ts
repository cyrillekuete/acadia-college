import type { SupabaseClient } from '@supabase/supabase-js';
import {
  validateAcadiaProfile,
  type AcadiaProfileGateResult,
} from '@/lib/auth/acadia-profile-gate';
import {
  fetchAcadiaUserProfile,
  type FetchAcadiaProfileResult,
} from '@/lib/supabase/queries/user';

export type CompleteAcadiaSignInResult = AcadiaProfileGateResult;

/** Profile fetch + gate only (no last-sign-in side effects). Safe for proxy. */
export async function resolveAcadiaProfileGate(
  supabase: SupabaseClient,
  userId: string,
): Promise<AcadiaProfileGateResult> {
  const fetchResult = await fetchAcadiaUserProfile(supabase, userId);
  return mapFetchToGate(fetchResult);
}

export async function completeAcadiaSignIn(
  supabase: SupabaseClient,
  userId: string,
): Promise<CompleteAcadiaSignInResult> {
  const gate = await resolveAcadiaProfileGate(supabase, userId);

  if (gate.ok) {
    void touchLastSignIn(supabase, userId);
  }

  return gate;
}

function mapFetchToGate(fetchResult: FetchAcadiaProfileResult): AcadiaProfileGateResult {
  if (fetchResult.status === 'error') {
    return validateAcadiaProfile(null, { queryFailed: true });
  }
  return validateAcadiaProfile(
    fetchResult.status === 'ok' ? fetchResult.profile : null,
  );
}

/** Best-effort: updates new `users.last_login` and legacy `User.lastSignInAt`. */
async function touchLastSignIn(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();

  const { error: newUsersError } = await supabase
    .from('users')
    .update({ last_login: now, updated_at: now })
    .eq('id', userId);

  if (newUsersError) {
    console.error('[touchLastSignIn] users:', newUsersError.message);
  }

  const { error: legacyError } = await supabase
    .from('User')
    .update({ lastSignInAt: now, updatedAt: now })
    .eq('id', userId);

  if (legacyError) {
    console.error('[touchLastSignIn] User:', legacyError.message);
  }
}
