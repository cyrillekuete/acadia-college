import type { SupabaseClient } from '@supabase/supabase-js';
import type { StudentListItem } from '@/lib/acadia/student-list-item';
import { buildTeacherTeachingScope } from '@/lib/acadia/staff-class-assignments';
import type { Database } from '@/lib/supabase/database.types';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { embed, FK } from '@/lib/supabase/embed-selects';
import { fetchStudentsFromEnrollmentsForClassIds } from '@/lib/supabase/queries/students-list';

type Client = SupabaseClient<Database>;

export type TeacherTeachingScopePair = {
  classId: string;
  subjectId: string;
  className: string;
  subjectName: string;
};

export type TeacherTeachingScope = {
  classIds: string[];
  subjectIds: string[];
  pairs: TeacherTeachingScopePair[];
};

export type TeacherStudentsResult = {
  students: StudentListItem[];
  scope: TeacherTeachingScope;
};

export async function fetchTeacherTeachingScope(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  staffProfileId: string,
): Promise<TeacherTeachingScope> {
  const { data, error } = await supabase
    .from('StaffClassSubjectAssignment')
    .select(
      `
      classId,
      subjectId,
      ${embed('Class', FK.StaffClassSubjectAssignment_class, 'name')},
      ${embed('Subject', FK.StaffClassSubjectAssignment_subject, 'nameEn, code')}
    `,
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('staffProfileId', staffProfileId);

  if (error) {
    throw error;
  }

  const rows = (data ?? []).map((row) => {
    const classId = row.classId as string;
    const subjectId = row.subjectId as string;
    const classRow = unwrapRelation<{ name?: string }>(row.Class);
    const subject = unwrapRelation<{ nameEn?: string; code?: string }>(row.Subject);
    return {
      classId,
      subjectId,
      className: classRow?.name?.trim() || classId,
      subjectName: subject?.nameEn?.trim() || subject?.code?.trim() || subjectId,
    };
  });

  return buildTeacherTeachingScope(rows);
}

export async function fetchStudentsForTeacher(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  staffProfileId: string,
): Promise<TeacherStudentsResult> {
  const scope = await fetchTeacherTeachingScope(
    supabase,
    tenantId,
    academicYearId,
    staffProfileId,
  );

  if (scope.classIds.length === 0) {
    return { students: [], scope };
  }

  const students = await fetchStudentsFromEnrollmentsForClassIds(
    supabase,
    tenantId,
    academicYearId,
    scope.classIds,
  );

  return { students, scope };
}
