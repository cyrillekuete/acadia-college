import type { SupabaseClient } from '@supabase/supabase-js';
import type { DummyStudent, StudentEnrollmentStatus } from '@/lib/acadia/dummy-students';
import { unwrapRelation } from '@/lib/acadia/record-display';

const LEGACY_STUDENTS_SELECT =
  'id, student_id, first_name, last_name, email, class_name, subsystem, branch, enrollment_status, enrollment_date, matricule_number, total_fees, paid_fees, fees_status, status';

type StudentsListRow = {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  class_name: string | null;
  subsystem: string | null;
  branch: string | null;
  enrollment_status: string | null;
  enrollment_date: string | null;
  matricule_number: string | null;
  total_fees: number | null;
  paid_fees: number | null;
  fees_status: string | null;
  status: string | null;
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

function mapLegacyRow(row: StudentsListRow): DummyStudent {
  const enrollmentStatus = normalizeEnrollmentStatus(row.enrollment_status);
  const enrollmentDate = row.enrollment_date
    ? new Date(row.enrollment_date).toISOString()
    : new Date().toISOString();

  return {
    id: row.id,
    student_id: row.student_id,
    registration_number: null,
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
    total_fees: Number(row.total_fees ?? 0),
    paid_fees: Number(row.paid_fees ?? 0),
    fees_status: row.fees_status,
  };
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

const ENROLLMENT_LIST_SELECT = `
  id,
  classId,
  status,
  createdAt,
  StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey (
    id,
    registrationNumber,
    matriculeNumber,
    isActive,
    User!StudentProfile_userId_tenantId_fkey ( name, email ),
    subSystem,
    branch
  ),
  Class!StudentEnrollment_classId_tenantId_fkey ( name )
`;

async function mapEnrollmentRowsToStudents(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
  rows: Array<Record<string, unknown>>,
): Promise<DummyStudent[]> {
  const feeByProfile = new Map<string, { total: number; paid: number; status: string | null }>();
  const profileIds = rows
    .map((row) => {
      const profile = unwrapRelation<{ id?: string }>(row.StudentProfile);
      return profile?.id ?? null;
    })
    .filter((id): id is string => !!id);

  if (profileIds.length > 0) {
    const { data: feeAccounts } = await supabase
      .from('StudentFeeAccount')
      .select('studentProfileId, totalAmountMinor, StudentFeeInstallment ( amountMinor, status, paidAmountMinor )')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .in('studentProfileId', profileIds);

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
        status: paid >= total && total > 0 ? 'paid' : paid > 0 ? 'partial' : 'outstanding',
      });
    }
  }

  return rows.map((row) => {
    const profile = unwrapRelation<{
      id: string;
      registrationNumber: string;
      matriculeNumber: string | null;
      isActive: boolean;
      User?: unknown;
      subSystem?: string;
      branch?: string;
    }>(row.StudentProfile);
    const user = unwrapRelation<{ name?: string; email?: string }>(profile?.User);
    const classRow = unwrapRelation<{ name?: string }>(row.Class);
    const { first, last } = splitName(user?.name);
    const enrollmentStatus =
      row.status === 'ENROLLED' ? 'active' : ('inactive' as StudentEnrollmentStatus);
    const fees = profile?.id ? feeByProfile.get(profile.id) : undefined;

    return {
      id: profile?.id ?? (row.id as string),
      student_id: profile?.registrationNumber ?? (row.id as string),
      registration_number: profile?.registrationNumber ?? null,
      first_name: first,
      last_name: last,
      email: user?.email ?? '',
      avatar: null,
      class_id: (row.classId as string | null) ?? null,
      class_name: classRow?.name ?? '—',
      subsystem: profile?.subSystem ?? null,
      branch: profile?.branch ?? null,
      matricule_number: profile?.matriculeNumber ?? null,
      enrollment_status: enrollmentStatus,
      status: profile?.isActive === false ? 'inactive' : 'active',
      enrollment_date: new Date(row.createdAt as string).toISOString(),
      email_verified: false,
      total_fees: fees?.total ?? 0,
      paid_fees: fees?.paid ?? 0,
      fees_status: fees?.status ?? null,
    } satisfies DummyStudent;
  });
}

async function fetchStudentsFromEnrollments(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
): Promise<DummyStudent[]> {
  const { data, error } = await supabase
    .from('StudentEnrollment')
    .select(ENROLLMENT_LIST_SELECT)
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .order('createdAt', { ascending: false });

  if (error) {
    throw error;
  }

  return mapEnrollmentRowsToStudents(
    supabase,
    tenantId,
    academicYearId,
    (data ?? []) as Array<Record<string, unknown>>,
  );
}

export async function fetchStudentsFromEnrollmentsForClassIds(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
  classIds: string[],
): Promise<DummyStudent[]> {
  if (classIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('StudentEnrollment')
    .select(ENROLLMENT_LIST_SELECT)
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('status', 'ENROLLED')
    .in('classId', classIds)
    .order('createdAt', { ascending: false });

  if (error) {
    throw error;
  }

  return mapEnrollmentRowsToStudents(
    supabase,
    tenantId,
    academicYearId,
    (data ?? []) as Array<Record<string, unknown>>,
  );
}

export async function fetchStudentsList(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId?: string | null,
): Promise<DummyStudent[]> {
  if (academicYearId) {
    return fetchStudentsFromEnrollments(supabase, tenantId, academicYearId);
  }

  const { data, error } = await supabase
    .from('students')
    .select(LEGACY_STUDENTS_SELECT)
    .eq('tenant_id', tenantId)
    .order('enrollment_date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapLegacyRow(row as StudentsListRow));
}
