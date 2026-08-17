import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeDisciplineCount,
  unenrolledDisciplineStudentIds,
  type ClassDisciplineDraft,
  type ClassDisciplineRow,
  type ClassDisciplineStudent,
} from '@/lib/acadia/class-discipline';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { uniqueIds } from '@/lib/acadia/staff-class-assignments';
import { embed, FK } from '@/lib/supabase/embed-selects';
import { splitStudentName } from '@/lib/supabase/queries/student-query-helpers';

type Client = SupabaseClient;

const ROSTER_SELECT = `
  studentProfileId,
  ${embed('StudentProfile', FK.StudentEnrollment_studentProfile, `
    id,
    matriculeNumber,
    registrationNumber,
    ${embed('User', FK.StudentProfile_user, 'name')}
  `)}
`;

export async function fetchClassMasterClassIds(
  supabase: Client,
  tenantId: string,
  staffProfileId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('Class')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('staffProfileId', staffProfileId);

  if (error) {
    throw new Error(getQueryErrorMessage(error));
  }

  return uniqueIds((data ?? []).map((row) => row.id ?? ''));
}

export async function fetchClassDisciplineRoster(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  classId: string,
  termNumber: number,
): Promise<{
  students: ClassDisciplineStudent[];
  records: Array<ClassDisciplineRow & { studentProfileId: string; id: string }>;
}> {
  const [enrollmentResult, disciplineResult] = await Promise.all([
    supabase
      .from('StudentEnrollment')
      .select(ROSTER_SELECT)
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('classId', classId)
      .eq('status', 'ENROLLED'),
    supabase
      .from('StudentTermDiscipline')
      .select(
        'id, studentProfileId, termNumber, absenceHours, suspensions, warnings',
      )
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('classId', classId)
      .eq('termNumber', termNumber),
  ]);

  if (enrollmentResult.error) {
    throw new Error(getQueryErrorMessage(enrollmentResult.error));
  }
  if (disciplineResult.error) {
    throw new Error(getQueryErrorMessage(disciplineResult.error));
  }

  const students: ClassDisciplineStudent[] = (
    (enrollmentResult.data ?? []) as unknown as Array<Record<string, unknown>>
  )
    .map((row) => {
      const profile = unwrapRelation<{
        id?: string;
        matriculeNumber?: string | null;
        registrationNumber?: string;
        User?: unknown;
      }>(row.StudentProfile);
      const user = unwrapRelation<{ name?: string | null }>(profile?.User);
      const { first, last } = splitStudentName(user?.name);
      const name = [first, last].filter(Boolean).join(' ').trim() || user?.name?.trim() || '—';
      return {
        studentProfileId: profile?.id ?? String(row.studentProfileId ?? ''),
        name,
        matricule: profile?.matriculeNumber?.trim() || profile?.registrationNumber || '—',
        registrationNumber: profile?.registrationNumber ?? '—',
      };
    })
    .filter((student) => student.studentProfileId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const records = (disciplineResult.data ?? []).map((row) => ({
    id: row.id,
    studentProfileId: row.studentProfileId,
    termNumber: row.termNumber,
    absenceHours: normalizeDisciplineCount(row.absenceHours, 999),
    suspensions: normalizeDisciplineCount(row.suspensions, 99),
    warnings: normalizeDisciplineCount(row.warnings, 99),
  }));

  return { students, records };
}

export async function fetchStudentTermDiscipline(
  supabase: Client,
  tenantId: string,
  studentProfileId: string,
  academicYearId: string,
): Promise<ClassDisciplineRow[]> {
  const { data, error } = await supabase
    .from('StudentTermDiscipline')
    .select('termNumber, absenceHours, suspensions, warnings')
    .eq('tenantId', tenantId)
    .eq('studentProfileId', studentProfileId)
    .eq('academicYearId', academicYearId);

  if (error) {
    throw new Error(getQueryErrorMessage(error));
  }

  return (data ?? []).map((row) => ({
    termNumber: row.termNumber,
    absenceHours: normalizeDisciplineCount(row.absenceHours, 999),
    suspensions: normalizeDisciplineCount(row.suspensions, 99),
    warnings: normalizeDisciplineCount(row.warnings, 99),
  }));
}

export async function upsertClassDisciplineRows(
  supabase: Client,
  input: {
    tenantId: string;
    academicYearId: string;
    classId: string;
    termNumber: number;
    recordedByStaffProfileId: string | null;
    rows: ClassDisciplineDraft[];
  },
): Promise<void> {
  if (input.rows.length === 0) {
    return;
  }

  const studentProfileIds = uniqueIds(input.rows.map((row) => row.studentProfileId));
  if (studentProfileIds.length === 0) {
    throw new Error(
      'Discipline can only be saved for students enrolled in this class.',
    );
  }
  const { data: enrolled, error: enrolledError } = await supabase
    .from('StudentEnrollment')
    .select('studentProfileId')
    .eq('tenantId', input.tenantId)
    .eq('academicYearId', input.academicYearId)
    .eq('classId', input.classId)
    .eq('status', 'ENROLLED')
    .in('studentProfileId', studentProfileIds);

  if (enrolledError) {
    throw new Error(getQueryErrorMessage(enrolledError));
  }

  const enrolledIds = new Set(
    (enrolled ?? []).map((row) => row.studentProfileId as string),
  );
  if (unenrolledDisciplineStudentIds(studentProfileIds, enrolledIds).length > 0) {
    throw new Error(
      'Discipline can only be saved for students enrolled in this class.',
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from('StudentTermDiscipline')
    .select('id, studentProfileId')
    .eq('tenantId', input.tenantId)
    .eq('academicYearId', input.academicYearId)
    .eq('classId', input.classId)
    .eq('termNumber', input.termNumber)
    .in('studentProfileId', studentProfileIds);

  if (existingError) {
    throw new Error(getQueryErrorMessage(existingError));
  }

  const existingByStudent = new Map(
    (existing ?? []).map((row) => [row.studentProfileId, row.id]),
  );
  const now = new Date().toISOString();

  const payload = input.rows.map((row) => ({
    id: existingByStudent.get(row.studentProfileId) ?? generateAcadiaId('std'),
    tenantId: input.tenantId,
    academicYearId: input.academicYearId,
    classId: input.classId,
    studentProfileId: row.studentProfileId,
    termNumber: input.termNumber,
    absenceHours: normalizeDisciplineCount(row.absenceHours, 999),
    suspensions: normalizeDisciplineCount(row.suspensions, 99),
    warnings: normalizeDisciplineCount(row.warnings, 99),
    recordedByStaffProfileId: input.recordedByStaffProfileId,
    updatedAt: now,
  }));

  const { error } = await supabase.from('StudentTermDiscipline').upsert(payload, {
    onConflict: 'tenantId,academicYearId,classId,studentProfileId,termNumber',
  });

  if (error) {
    throw new Error(getQueryErrorMessage(error));
  }
}
