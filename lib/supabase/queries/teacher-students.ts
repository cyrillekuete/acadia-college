import type { SupabaseClient } from '@supabase/supabase-js';
import type { StudentListItem } from '@/lib/acadia/student-list-item';
import { buildTeacherTeachingScope, mergeTeacherClassScope } from '@/lib/acadia/staff-class-assignments';
import type { Database } from '@/lib/supabase/database.types';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { embed, FK } from '@/lib/supabase/embed-selects';
import { fetchStudentsFromEnrollmentsForClassIds } from '@/lib/supabase/queries/students-list';

type Client = SupabaseClient<Database>;

type TeachingScopeRow = {
  classId: string;
  subjectId: string;
  Class?: unknown;
  Subject?: unknown;
};

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
  classMaster?: TeacherTeachingScopePair[];
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

  const rows = ((data ?? []) as unknown as TeachingScopeRow[]).map((row) => {
    const classId = row.classId;
    const subjectId = row.subjectId;
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

async function fetchClassMasterScope(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  staffProfileId: string,
): Promise<TeacherTeachingScopePair[]> {
  const { data, error } = await supabase
    .from('StaffClassAssignment')
    .select(
      `
      classId,
      ${embed('Class', FK.StaffClassAssignment_class, 'name')}
    `,
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('staffProfileId', staffProfileId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<{ classId: string; Class?: unknown }>).map((row) => {
    const classRow = unwrapRelation<{ name?: string }>(row.Class);
    return {
      classId: row.classId,
      subjectId: '',
      className: classRow?.name?.trim() || row.classId,
      subjectName: '',
    };
  });
}

export async function fetchStudentsForTeacher(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  staffProfileId: string,
): Promise<TeacherStudentsResult> {
  const [subjectScope, classMaster] = await Promise.all([
    fetchTeacherTeachingScope(supabase, tenantId, academicYearId, staffProfileId),
    fetchClassMasterScope(supabase, tenantId, academicYearId, staffProfileId),
  ]);

  const scope = mergeTeacherClassScope(subjectScope, classMaster);

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
