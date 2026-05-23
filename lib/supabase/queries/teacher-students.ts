import type { SupabaseClient } from '@supabase/supabase-js';
import type { DummyStudent } from '@/lib/acadia/dummy-students';
import type { Database } from '@/lib/supabase/database.types';
import { unwrapRelation } from '@/lib/acadia/record-display';
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
  students: DummyStudent[];
  scope: TeacherTeachingScope;
};

export function resolveTeacherTeachingClassIds(input: {
  assignedClassIds: string[];
  assignedSubjectIds: string[];
  classSubjectPairs: Array<{ classId: string; subjectId: string }>;
}): string[] {
  const assignedClasses = new Set(input.assignedClassIds);
  const assignedSubjects = new Set(input.assignedSubjectIds);
  const classIds = new Set<string>();

  for (const pair of input.classSubjectPairs) {
    if (
      assignedClasses.has(pair.classId) &&
      assignedSubjects.has(pair.subjectId)
    ) {
      classIds.add(pair.classId);
    }
  }

  return Array.from(classIds);
}

export async function fetchTeacherTeachingScope(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  staffProfileId: string,
): Promise<TeacherTeachingScope> {
  const [subjectResult, classResult] = await Promise.all([
    supabase
      .from('SubjectAssignment')
      .select('subjectId, Subject!SubjectAssignment_subjectId_tenantId_fkey ( nameEn, code )')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('staffProfileId', staffProfileId),
    supabase
      .from('StaffClassAssignment')
      .select('classId, Class!StaffClassAssignment_classId_tenantId_fkey ( name )')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('staffProfileId', staffProfileId),
  ]);

  if (subjectResult.error) {
    throw subjectResult.error;
  }
  if (classResult.error) {
    throw classResult.error;
  }

  const subjectIds = (subjectResult.data ?? []).map((row) => row.subjectId as string);
  const assignedClassIds = (classResult.data ?? []).map((row) => row.classId as string);

  const subjectNameById = new Map<string, string>();
  for (const row of subjectResult.data ?? []) {
    const subjectId = row.subjectId as string;
    const subject = unwrapRelation<{ nameEn?: string; code?: string }>(row.Subject);
    const label = subject?.nameEn?.trim() || subject?.code?.trim() || subjectId;
    subjectNameById.set(subjectId, label);
  }

  const classNameById = new Map<string, string>();
  for (const row of classResult.data ?? []) {
    const classId = row.classId as string;
    const classRow = unwrapRelation<{ name?: string }>(row.Class);
    classNameById.set(classId, classRow?.name?.trim() || classId);
  }

  if (assignedClassIds.length === 0 || subjectIds.length === 0) {
    return { classIds: [], subjectIds, pairs: [] };
  }

  const { data: classSubjectRows, error: classSubjectError } = await supabase
    .from('ClassSubject')
    .select('classId, subjectId')
    .eq('tenantId', tenantId)
    .in('classId', assignedClassIds);

  if (classSubjectError) {
    throw classSubjectError;
  }

  const classSubjectPairs = (classSubjectRows ?? []).map((row) => ({
    classId: row.classId as string,
    subjectId: row.subjectId as string,
  }));

  const scopedClassIds = resolveTeacherTeachingClassIds({
    assignedClassIds,
    assignedSubjectIds: subjectIds,
    classSubjectPairs,
  });

  const scopedClassIdSet = new Set(scopedClassIds);
  const pairs: TeacherTeachingScopePair[] = [];

  for (const pair of classSubjectPairs) {
    if (
      !scopedClassIdSet.has(pair.classId) ||
      !subjectIds.includes(pair.subjectId)
    ) {
      continue;
    }
    pairs.push({
      classId: pair.classId,
      subjectId: pair.subjectId,
      className: classNameById.get(pair.classId) ?? pair.classId,
      subjectName: subjectNameById.get(pair.subjectId) ?? pair.subjectId,
    });
  }

  return {
    classIds: scopedClassIds,
    subjectIds,
    pairs,
  };
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
