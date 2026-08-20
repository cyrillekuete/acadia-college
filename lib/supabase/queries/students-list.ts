import type { SupabaseClient } from '@supabase/supabase-js';
import type { StudentListItem } from '@/lib/acadia/student-list-item';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { isAcadiaEmailVerified } from '@/lib/acadia/email-verified';
import {
  collapseEnrollmentsByProfile,
  mapEnrollmentStatus,
} from '@/lib/acadia/student-enrollment';
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

function collapseListEnrollmentRows(
  rows: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return collapseEnrollmentsByProfile(
    rows.map((row) => ({
      ...row,
      status: String(row.status ?? ''),
      createdAt: String(row.createdAt ?? ''),
      classId: (row.classId as string | null) ?? null,
      profileId: unwrapRelation<{ id?: string }>(row.StudentProfile)?.id ?? '',
    })),
  );
}

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
    const enrollmentStatus = mapEnrollmentStatus(
      row.status as string,
      (row.classId as string | null) ?? null,
    );
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

  const rows = collapseListEnrollmentRows(
    (data ?? []) as Array<Record<string, unknown>>,
  );
  const profileIds = rows
    .map((row) => row.profileId)
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
  options?: { includeWithdrawn?: boolean },
): Promise<StudentListItem[]> {
  if (classIds.length === 0) {
    return [];
  }

  let query = supabase
    .from('StudentEnrollment')
    .select(ENROLLMENT_LIST_SELECT)
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .in('classId', classIds)
    .order('createdAt', { ascending: false });

  if (options?.includeWithdrawn) {
    query = query.in('status', ['ENROLLED', 'WITHDRAWN']);
  } else {
    query = query.eq('status', 'ENROLLED');
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const collapsed = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const profileId = unwrapRelation<{ id?: string }>(row.StudentProfile)?.id ?? '';
    if (!profileId) {
      continue;
    }
    const existing = collapsed.get(profileId);
    if (!existing || (existing.status !== 'ENROLLED' && row.status === 'ENROLLED')) {
      collapsed.set(profileId, row);
    }
  }
  const uniqueRows = Array.from(collapsed.values());
  const profileIds = uniqueRows
    .map((row) => unwrapRelation<{ id?: string }>(row.StudentProfile)?.id ?? null)
    .filter((id): id is string => !!id);

  const feeByProfile = await loadFeeSummariesForProfiles(
    supabase,
    tenantId,
    academicYearId,
    profileIds,
  );

  return mapEnrollmentRowsToStudents(uniqueRows, feeByProfile);
}

/** Students enrolled in the active academic year (single read path). */
export async function fetchStudentsList(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
): Promise<StudentListItem[]> {
  return fetchStudentsFromEnrollments(supabase, tenantId, academicYearId);
}
