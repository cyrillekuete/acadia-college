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

export async function completeAcadiaSignIn(
  supabase: SupabaseClient,
  userId: string,
): Promise<CompleteAcadiaSignInResult> {
  const fetchResult = await fetchAcadiaUserProfile(supabase, userId);
  const gate = mapFetchToGate(fetchResult);

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

async function touchLastSignIn(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('User')
    .update({ lastSignInAt: now, updatedAt: now })
    .eq('id', userId);
}
