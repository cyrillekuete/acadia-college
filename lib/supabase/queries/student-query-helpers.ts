import type { SupabaseClient } from '@supabase/supabase-js';
import type { StudentEnrollmentStatus } from '@/lib/acadia/student-list-item';

export function normalizeEnrollmentStatus(
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

export function splitStudentName(fullName: string | null | undefined): {
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

export type StudentFeeSummary = {
  total: number;
  paid: number;
  status: string | null;
};

function feeStatusFromTotals(total: number, paid: number): string | null {
  if (total <= 0) {
    return null;
  }
  if (paid >= total) {
    return 'paid';
  }
  if (paid > 0) {
    return 'partial';
  }
  return 'outstanding';
}

export async function loadFeeSummaryForProfile(
  supabase: SupabaseClient,
  tenantId: string,
  profileId: string,
  academicYearId?: string | null,
): Promise<StudentFeeSummary> {
  if (!academicYearId) {
    return { total: 0, paid: 0, status: null };
  }

  const { data: account, error } = await supabase
    .from('StudentFeeAccount')
    .select(
      'totalAmountMinor, StudentFeeInstallment ( amountMinor, paidAmountMinor )',
    )
    .eq('tenantId', tenantId)
    .eq('studentProfileId', profileId)
    .eq('academicYearId', academicYearId)
    .maybeSingle();

  if (error) {
    throw error;
  }

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

  return {
    total,
    paid,
    status: feeStatusFromTotals(total, paid),
  };
}

export async function loadFeeSummariesForProfiles(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
  profileIds: string[],
): Promise<Map<string, StudentFeeSummary>> {
  const feeByProfile = new Map<string, StudentFeeSummary>();
  if (profileIds.length === 0) {
    return feeByProfile;
  }

  const { data: feeAccounts, error } = await supabase
    .from('StudentFeeAccount')
    .select(
      'studentProfileId, totalAmountMinor, StudentFeeInstallment ( amountMinor, status, paidAmountMinor )',
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .in('studentProfileId', profileIds);

  if (error) {
    throw error;
  }

  for (const account of feeAccounts ?? []) {
    const profileId = account.studentProfileId as string;
    const installments = (account.StudentFeeInstallment ?? []) as Array<{
      amountMinor: number;
      status: string;
      paidAmountMinor: number | null;
    }>;
    const paid = installments.reduce(
      (sum, row) => sum + Number(row.paidAmountMinor ?? 0),
      0,
    );
    const total = Number(account.totalAmountMinor ?? 0);
    feeByProfile.set(profileId, {
      total,
      paid,
      status: feeStatusFromTotals(total, paid),
    });
  }

  return feeByProfile;
}

/**
 * Resolve any supported student identifier to a `StudentProfile.id`.
 * Accepts profile UUID, registration number, or legacy `students.id` UUID.
 */
export async function resolveStudentProfileId(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
): Promise<string | null> {
  const { data: byProfileId, error: byProfileIdError } = await supabase
    .from('StudentProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('id', id)
    .maybeSingle();

  if (byProfileIdError) {
    throw byProfileIdError;
  }
  if (byProfileId?.id) {
    return byProfileId.id as string;
  }

  const { data: byRegistration, error: byRegistrationError } = await supabase
    .from('StudentProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('registrationNumber', id)
    .maybeSingle();

  if (byRegistrationError) {
    throw byRegistrationError;
  }
  if (byRegistration?.id) {
    return byRegistration.id as string;
  }

  const { data: legacyRow, error: legacyError } = await supabase
    .from('students')
    .select('student_id')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .maybeSingle();

  if (legacyError) {
    throw legacyError;
  }
  if (!legacyRow?.student_id) {
    return null;
  }

  const { data: profileLink, error: linkError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('role_specific_id', legacyRow.student_id as string)
    .maybeSingle();

  if (linkError) {
    throw linkError;
  }
  if (!profileLink?.user_id) {
    return null;
  }

  const { data: profileByUser, error: profileByUserError } = await supabase
    .from('StudentProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('userId', profileLink.user_id as string)
    .maybeSingle();

  if (profileByUserError) {
    throw profileByUserError;
  }

  return (profileByUser?.id as string | undefined) ?? null;
}
