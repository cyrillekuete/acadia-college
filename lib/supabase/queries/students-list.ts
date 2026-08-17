import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  StudentEnrollmentStatus,
  StudentListItem,
} from '@/lib/acadia/student-list-item';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { isAcadiaEmailVerified } from '@/lib/acadia/email-verified';
import {
  loadFeeSummariesForProfiles,
  splitStudentName,
} from '@/lib/supabase/queries/student-query-helpers';

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

function mapEnrollmentRowsToStudents(
  rows: Array<Record<string, unknown>>,
  feeByProfile: Map<string, { total: number; paid: number; status: string | null }>,
): StudentListItem[] {
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
    const { first, last } = splitStudentName(user?.name);
    const enrollmentStatus: StudentEnrollmentStatus =
      row.status === 'ENROLLED' ? 'active' : 'inactive';
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
      email_verified: isAcadiaEmailVerified(),
      total_fees: fees?.total ?? 0,
      paid_fees: fees?.paid ?? 0,
      fees_status: fees?.status ?? null,
    } satisfies StudentListItem;
  });
}

async function fetchStudentsFromEnrollments(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
): Promise<StudentListItem[]> {
  const { data, error } = await supabase
    .from('StudentEnrollment')
    .select(ENROLLMENT_LIST_SELECT)
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .order('createdAt', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const profileIds = rows
    .map((row) => unwrapRelation<{ id?: string }>(row.StudentProfile)?.id ?? null)
    .filter((id): id is string => !!id);

  const feeByProfile = await loadFeeSummariesForProfiles(
    supabase,
    tenantId,
    academicYearId,
    profileIds,
  );

  return mapEnrollmentRowsToStudents(rows, feeByProfile);
}

export async function fetchStudentsFromEnrollmentsForClassIds(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
  classIds: string[],
): Promise<StudentListItem[]> {
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

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const profileIds = rows
    .map((row) => unwrapRelation<{ id?: string }>(row.StudentProfile)?.id ?? null)
    .filter((id): id is string => !!id);

  const feeByProfile = await loadFeeSummariesForProfiles(
    supabase,
    tenantId,
    academicYearId,
    profileIds,
  );

  return mapEnrollmentRowsToStudents(rows, feeByProfile);
}

/** Students enrolled in the active academic year (single read path). */
export async function fetchStudentsList(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
): Promise<StudentListItem[]> {
  return fetchStudentsFromEnrollments(supabase, tenantId, academicYearId);
}
