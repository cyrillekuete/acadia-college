import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  StudentEnrollmentStatus,
  StudentListItem,
} from '@/lib/acadia/student-list-item';
import { unwrapRelation } from '@/lib/acadia/record-display';
import {
  loadFeeSummaryForProfile,
  resolveStudentProfileId,
  splitStudentName,
} from '@/lib/supabase/queries/student-query-helpers';

export type StudentDetailRecord = StudentListItem & {
  profileId: string;
  userId: string;
  registrationNumber: string;
  subSystem: string | null;
  branch: string | null;
  levelId: string | null;
  alumniDirectoryOptIn: boolean;
  alumniSince: string | null;
  country: string | null;
  timezone: string | null;
};

async function fetchFromStudentProfile(
  supabase: SupabaseClient,
  tenantId: string,
  profileId: string,
  academicYearId?: string | null,
): Promise<StudentDetailRecord | null> {
  const { data: profile, error: profileError } = await supabase
    .from('StudentProfile')
    .select(
      `
      id,
      registrationNumber,
      matriculeNumber,
      isActive,
      subSystem,
      branch,
      currentLevelId,
      alumniDirectoryOptIn,
      alumniSince,
      User!StudentProfile_userId_tenantId_fkey (
        id,
        name,
        email,
        country,
        timezone,
        emailVerifiedAt
      )
    `,
    )
    .eq('id', profileId)
    .eq('tenantId', tenantId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }
  if (!profile) {
    return null;
  }

  const user = unwrapRelation<{
    id: string;
    name?: string;
    email?: string;
    country?: string | null;
    timezone?: string | null;
    emailVerifiedAt?: string | null;
  }>(profile.User);

  const { first, last } = splitStudentName(user?.name);

  let className = '—';
  let classId: string | null = null;
  let enrollmentStatus: StudentEnrollmentStatus = 'pending';
  let enrollmentDate = new Date().toISOString();

  if (academicYearId) {
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('StudentEnrollment')
      .select(
        `
        status,
        createdAt,
        classId,
        Class!StudentEnrollment_classId_tenantId_fkey ( name )
      `,
      )
      .eq('tenantId', tenantId)
      .eq('studentProfileId', profileId)
      .eq('academicYearId', academicYearId)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (enrollmentError) {
      throw enrollmentError;
    }

    if (enrollment) {
      enrollmentStatus =
        enrollment.status === 'ENROLLED'
          ? 'active'
          : ('inactive' as StudentEnrollmentStatus);
      enrollmentDate = new Date(enrollment.createdAt as string).toISOString();
      classId = (enrollment.classId as string | null) ?? null;
      const classRow = unwrapRelation<{ name?: string }>(enrollment.Class);
      className = classRow?.name ?? '—';
    }
  }

  const feeByProfile = await loadFeeSummaryForProfile(
    supabase,
    tenantId,
    profileId,
    academicYearId,
  );

  return {
    id: profile.id,
    student_id: profile.registrationNumber,
    profileId: profile.id,
    userId: user?.id ?? '',
    registrationNumber: profile.registrationNumber,
    registration_number: profile.registrationNumber,
    first_name: first,
    last_name: last,
    email: user?.email ?? '',
    avatar: null,
    class_id: classId,
    class_name: className,
    subsystem: profile.subSystem as string | null,
    branch: profile.branch as string | null,
    matricule_number: (profile.matriculeNumber as string | null) ?? null,
    enrollment_status: enrollmentStatus,
    status: profile.isActive === false ? 'inactive' : 'active',
    enrollment_date: enrollmentDate,
    email_verified: !!user?.emailVerifiedAt,
    total_fees: feeByProfile.total,
    paid_fees: feeByProfile.paid,
    fees_status: feeByProfile.status,
    subSystem: profile.subSystem as string | null,
    levelId: profile.currentLevelId as string | null,
    alumniDirectoryOptIn: profile.alumniDirectoryOptIn as boolean,
    alumniSince: (profile.alumniSince as string | null) ?? null,
    country: user?.country ?? null,
    timezone: user?.timezone ?? null,
  };
}

export async function fetchStudentDetail(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  academicYearId?: string | null,
): Promise<StudentDetailRecord | null> {
  const profileId = await resolveStudentProfileId(supabase, tenantId, id);
  if (!profileId) {
    return null;
  }

  return fetchFromStudentProfile(
    supabase,
    tenantId,
    profileId,
    academicYearId,
  );
}
