import {
  isAdmin,
  isGuardian,
  isStaffOrTeacher,
  isStudent,
} from '@/lib/acadia/roles';
import type { SessionApiContext } from '@/lib/acadia/require-session-api';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchStudentProfileIdForUser } from '@/lib/supabase/queries/profile-links';

export async function canAccessStudentReportCard(
  supabase: SupabaseClient,
  ctx: SessionApiContext,
  studentProfileId: string,
): Promise<boolean> {
  if (isAdmin(ctx.roleSlug) || isStaffOrTeacher(ctx.roleSlug)) {
    return true;
  }

  if (isStudent(ctx.roleSlug)) {
    const ownId = await fetchStudentProfileIdForUser(supabase, ctx.tenantId, ctx.actorUserId);
    return ownId === studentProfileId;
  }

  if (isGuardian(ctx.roleSlug)) {
    const { data, error } = await supabase
      .from('GuardianStudentLink')
      .select('studentProfileId')
      .eq('tenantId', ctx.tenantId)
      .eq('guardianUserId', ctx.actorUserId)
      .eq('studentProfileId', studentProfileId)
      .is('consentRevokedAt', null)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return Boolean(data?.studentProfileId);
  }

  return false;
}
