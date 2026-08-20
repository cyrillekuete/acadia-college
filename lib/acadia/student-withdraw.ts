import type { SupabaseClient } from '@supabase/supabase-js';
import { UserStatus } from '@/app/models/user';
import { appendSystemLog } from '@/lib/acadia/system-log';

export type WithdrawStudentResult =
  | {
      ok: true;
      enrollmentId: string | null;
      deactivated: boolean;
    }
  | { ok: false; message: string; status: number };

export async function withdrawStudentFromYear(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    profileId: string;
    academicYearId: string;
    actorUserId: string;
    deactivateProfile?: boolean;
  },
): Promise<WithdrawStudentResult> {
  const now = new Date().toISOString();

  const { data: enrollment, error: lookupError } = await supabase
    .from('StudentEnrollment')
    .select('id, classId, status')
    .eq('tenantId', input.tenantId)
    .eq('studentProfileId', input.profileId)
    .eq('academicYearId', input.academicYearId)
    .eq('status', 'ENROLLED')
    .maybeSingle();

  if (lookupError) {
    return { ok: false, message: lookupError.message, status: 400 };
  }

  if (enrollment?.id) {
    const { error: updateError } = await supabase
      .from('StudentEnrollment')
      .update({ status: 'WITHDRAWN', updatedAt: now })
      .eq('id', enrollment.id)
      .eq('tenantId', input.tenantId);
    if (updateError) {
      return { ok: false, message: updateError.message, status: 400 };
    }
  } else if (!input.deactivateProfile) {
    return {
      ok: false,
      message: 'This student is not enrolled in the selected academic year.',
      status: 400,
    };
  }

  if (input.deactivateProfile) {
    const { data: profile, error: profileError } = await supabase
      .from('StudentProfile')
      .update({ isActive: false, updatedAt: now })
      .eq('id', input.profileId)
      .eq('tenantId', input.tenantId)
      .select('userId')
      .maybeSingle();
    if (profileError) {
      return { ok: false, message: profileError.message, status: 400 };
    }
    if (profile?.userId) {
      await supabase
        .from('User')
        .update({ status: UserStatus.INACTIVE, updatedAt: now })
        .eq('id', profile.userId)
        .eq('tenantId', input.tenantId);
    }
  }

  const { error: freezeError } = await supabase
    .from('StudentFeeAccount')
    .update({ withdrawnAt: now, updatedAt: now })
    .eq('tenantId', input.tenantId)
    .eq('studentProfileId', input.profileId)
    .eq('academicYearId', input.academicYearId)
    .is('withdrawnAt', null);
  if (freezeError) {
    return { ok: false, message: freezeError.message, status: 400 };
  }

  void appendSystemLog(supabase, {
    userId: input.actorUserId,
    event: 'student.withdrawn',
    description: `Withdrew student ${input.profileId} from academic year ${input.academicYearId}`,
    entityId: input.profileId,
    entityType: 'StudentProfile',
    meta: {
      academicYearId: input.academicYearId,
      enrollmentId: enrollment?.id ?? null,
      classId: enrollment?.classId ?? null,
      deactivated: Boolean(input.deactivateProfile),
    },
  });

  return {
    ok: true,
    enrollmentId: enrollment?.id ?? null,
    deactivated: Boolean(input.deactivateProfile),
  };
}
