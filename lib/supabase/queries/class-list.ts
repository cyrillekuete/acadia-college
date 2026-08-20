import type { SupabaseClient } from '@supabase/supabase-js';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';

export type ClassListRow = {
  id: string;
  name: string;
  levelId: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  staffProfileId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  isDefaultPromotionTarget: boolean;
  createdAt: string;
  Level?: { name?: string; number?: number } | null;
  StaffProfile?: { User?: { name?: string | null } | null } | null;
  enrollmentCount: number;
  subjectCount: number;
};

export type ClassListFilters = {
  subSystem?: AcademicSubSystem | null;
  branch?: AcademicBranch | null;
  levelId?: string | null;
};

export async function fetchClassList(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId?: string | null,
  filters?: ClassListFilters,
): Promise<ClassListRow[]> {
  let query = supabase
    .from('Class')
    .select(
      `
      id,
      name,
      levelId,
      subSystem,
      branch,
      staffProfileId,
      status,
      isDefaultPromotionTarget,
      createdAt,
      Level!Class_levelId_tenantId_fkey ( name, number ),
      StaffProfile!Class_staffProfileId_tenantId_fkey (
        staffCode,
        User!StaffProfile_userId_tenantId_fkey ( name )
      )
    `,
    )
    .eq('tenantId', tenantId)
    .order('name', { ascending: true });

  if (filters?.subSystem) {
    query = query.eq('subSystem', filters.subSystem);
  }
  if (filters?.branch) {
    query = query.eq('branch', filters.branch);
  }
  if (filters?.levelId) {
    query = query.eq('levelId', filters.levelId);
  }

  const { data: classes, error } = await query;
  if (error) {
    throw new Error(getQueryErrorMessage(error));
  }

  const rows = classes ?? [];
  if (rows.length === 0) {
    return [];
  }

  const classIds = rows.map((row) => row.id as string);

  let enrollmentQuery = supabase
    .from('StudentEnrollment')
    .select('classId')
    .eq('tenantId', tenantId)
    .in('classId', classIds);
  if (academicYearId) {
    enrollmentQuery = enrollmentQuery.eq('academicYearId', academicYearId);
  }

  const [
    { data: enrollments, error: enrollmentError },
    { data: classSubjects, error: classSubjectsError },
  ] = await Promise.all([
    enrollmentQuery,
    supabase
      .from('ClassSubject')
      .select('classId')
      .eq('tenantId', tenantId)
      .in('classId', classIds),
  ]);

  if (enrollmentError) {
    throw new Error(getQueryErrorMessage(enrollmentError));
  }
  if (classSubjectsError) {
    throw new Error(getQueryErrorMessage(classSubjectsError));
  }

  const enrollmentByClass = new Map<string, number>();
  for (const row of enrollments ?? []) {
    const id = row.classId as string;
    if (id) {
      enrollmentByClass.set(id, (enrollmentByClass.get(id) ?? 0) + 1);
    }
  }

  const subjectsByClass = new Map<string, number>();
  for (const row of classSubjects ?? []) {
    const id = row.classId as string;
    subjectsByClass.set(id, (subjectsByClass.get(id) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...(row as Omit<ClassListRow, 'enrollmentCount' | 'subjectCount'>),
    enrollmentCount: enrollmentByClass.get(row.id as string) ?? 0,
    subjectCount: subjectsByClass.get(row.id as string) ?? 0,
  })) as ClassListRow[];
}
