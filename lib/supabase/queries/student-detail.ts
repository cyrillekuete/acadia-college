import type { SupabaseClient } from '@supabase/supabase-js';
import type { DummyStudent, StudentEnrollmentStatus } from '@/lib/acadia/dummy-students';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { getDummyStudentById } from '@/lib/acadia/dummy-students';

export type StudentDetailRecord = DummyStudent & {
  profileId: string;
  userId: string;
  registrationNumber: string;
  specialtyId: string | null;
  levelId: string | null;
  alumniDirectoryOptIn: boolean;
  alumniSince: string | null;
  country: string | null;
  timezone: string | null;
};

function normalizeEnrollmentStatus(
  value: string | null | undefined,
): StudentEnrollmentStatus {
  const normalized = (value ?? 'pending').toLowerCase();
  if (normalized === 'active' || normalized === 'enrolled') {
    return 'active';
  }
  if (normalized === 'pending') {
    return 'pending';
  }
  return 'inactive';
}

function splitName(fullName: string | null | undefined): {
  first: string;
  last: string;
} {
  const trimmed = (fullName ?? '').trim();
  if (!trimmed) {
    return { first: 'Student', last: '' };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { first: parts[0]!, last: '' };
  }
  return { first: parts[0]!, last: parts.slice(1).join(' ') };
}

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
      isActive,
      specialtyId,
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
      ),
      Specialty!StudentProfile_specialtyId_tenantId_fkey ( subSystem, branch )
    `,
    )
    .eq('id', profileId)
    .eq('tenantId', tenantId)
    .maybeSingle();

  if (profileError || !profile) {
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
  const specialty = unwrapRelation<{ subSystem?: string; branch?: string }>(
    profile.Specialty,
  );
  const { first, last } = splitName(user?.name);

  let className = '—';
  let enrollmentStatus: StudentEnrollmentStatus = 'pending';
  let enrollmentDate = new Date().toISOString();

  if (academicYearId) {
    const { data: enrollment } = await supabase
      .from('StudentEnrollment')
      .select(
        `
        status,
        createdAt,
        Class!StudentEnrollment_classId_tenantId_fkey ( name )
      `,
      )
      .eq('tenantId', tenantId)
      .eq('studentProfileId', profileId)
      .eq('academicYearId', academicYearId)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (enrollment) {
      enrollmentStatus =
        enrollment.status === 'ENROLLED'
          ? 'active'
          : ('inactive' as StudentEnrollmentStatus);
      enrollmentDate = new Date(enrollment.createdAt as string).toISOString();
      const classRow = unwrapRelation<{ name?: string }>(enrollment.Class);
      className = classRow?.name ?? '—';
    }
  }

  const feeByProfile = await loadFeeSummary(
    supabase,
    tenantId,
    profileId,
    academicYearId,
  );

  return {
    id: profile.id,
    student_id: profile.id,
    profileId: profile.id,
    userId: user?.id ?? '',
    registrationNumber: profile.registrationNumber,
    first_name: first,
    last_name: last,
    email: user?.email ?? '',
    avatar: null,
    class_name: className,
    subsystem: specialty?.subSystem ?? null,
    branch: specialty?.branch ?? null,
    matricule_number: profile.registrationNumber,
    enrollment_status: enrollmentStatus,
    status: profile.isActive === false ? 'inactive' : 'active',
    enrollment_date: enrollmentDate,
    email_verified: !!user?.emailVerifiedAt,
    total_fees: feeByProfile.total,
    paid_fees: feeByProfile.paid,
    fees_status: feeByProfile.status,
    specialtyId: profile.specialtyId as string | null,
    levelId: profile.currentLevelId as string | null,
    alumniDirectoryOptIn: profile.alumniDirectoryOptIn as boolean,
    alumniSince: (profile.alumniSince as string | null) ?? null,
    country: user?.country ?? null,
    timezone: user?.timezone ?? null,
  };
}

async function loadFeeSummary(
  supabase: SupabaseClient,
  tenantId: string,
  profileId: string,
  academicYearId?: string | null,
): Promise<{ total: number; paid: number; status: string | null }> {
  if (!academicYearId) {
    return { total: 0, paid: 0, status: null };
  }

  const { data: account } = await supabase
    .from('StudentFeeAccount')
    .select(
      'totalAmountMinor, StudentFeeInstallment ( amountMinor, paidAmountMinor )',
    )
    .eq('tenantId', tenantId)
    .eq('studentProfileId', profileId)
    .eq('academicYearId', academicYearId)
    .maybeSingle();

  if (!account) {
    return { total: 0, paid: 0, status: null };
  }

  const installments = (account.StudentFeeInstallment ?? []) as Array<{
    paidAmountMinor: number | null;
  }>;
  const paid = installments.reduce(
    (sum, row) => sum + Number(row.paidAmountMinor ?? 0),
    0,
  );
  const total = Number(account.totalAmountMinor ?? 0);
  const status =
    paid >= total && total > 0
      ? 'paid'
      : paid > 0
        ? 'partial'
        : 'outstanding';

  return { total, paid, status };
}

async function fetchLegacyStudentDetail(
  supabase: SupabaseClient,
  tenantId: string,
  legacyUuid: string,
): Promise<StudentDetailRecord | null> {
  const { data: row, error } = await supabase
    .from('students')
    .select(
      'id, student_id, first_name, last_name, email, class_name, subsystem, branch, enrollment_status, enrollment_date, matricule_number, status, tenant_id, country',
    )
    .eq('id', legacyUuid)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const enrollmentStatus = normalizeEnrollmentStatus(row.enrollment_status);
  const enrollmentDate = row.enrollment_date
    ? new Date(row.enrollment_date).toISOString()
    : new Date().toISOString();

  const { data: link } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('role_specific_id', row.student_id)
    .maybeSingle();

  return {
    id: row.id,
    student_id: row.student_id,
    profileId: row.id,
    userId: (link?.user_id as string) ?? '',
    registrationNumber: row.matricule_number ?? row.student_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email ?? '',
    avatar: null,
    class_name: row.class_name ?? '—',
    subsystem: row.subsystem,
    branch: row.branch,
    matricule_number: row.matricule_number,
    enrollment_status: enrollmentStatus,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    enrollment_date: enrollmentDate,
    email_verified: false,
    total_fees: 0,
    paid_fees: 0,
    fees_status: null,
    specialtyId: null,
    levelId: null,
    alumniDirectoryOptIn: false,
    alumniSince: null,
    country: row.country ?? null,
    timezone: null,
  };
}

export async function fetchStudentDetail(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  academicYearId?: string | null,
): Promise<StudentDetailRecord | null> {
  const fromProfile = await fetchFromStudentProfile(
    supabase,
    tenantId,
    id,
    academicYearId,
  );
  if (fromProfile) {
    return fromProfile;
  }

  const fromLegacy = await fetchLegacyStudentDetail(supabase, tenantId, id);
  if (fromLegacy) {
    return fromLegacy;
  }

  const dummy = getDummyStudentById(id);
  if (!dummy) {
    return null;
  }

  return {
    ...dummy,
    profileId: dummy.id,
    userId: '',
    registrationNumber: dummy.matricule_number ?? dummy.student_id,
    specialtyId: null,
    levelId: null,
    alumniDirectoryOptIn: false,
    alumniSince: null,
    country: null,
    timezone: null,
  };
}
