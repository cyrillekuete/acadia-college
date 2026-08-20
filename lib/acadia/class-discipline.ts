import { canWriteAcademicAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';
import type { DisciplineInfo, ReportCardTerm } from '@/lib/acadia/report-card-types';

export const CLASS_DISCIPLINE_TERMS = ['1', '2', '3', '4', '5', '6'] as const;

export type ClassDisciplineTerm = `${number}`;

export type ClassDisciplineRow = {
  termNumber: number;
  absenceHours: number;
  suspensions: number;
  warnings: number;
};

export type ClassDisciplineStudent = {
  studentProfileId: string;
  name: string;
  matricule: string;
  registrationNumber: string;
};

export type ClassDisciplineDraft = {
  studentProfileId: string;
  absenceHours: number;
  suspensions: number;
  warnings: number;
};

const EMPTY_DISCIPLINE: DisciplineInfo = {
  absences: 0,
  suspensions: 0,
  warnings: 0,
};

export function parseClassDisciplineTerm(
  raw: string | null | undefined,
): ClassDisciplineTerm {
  const n = Number((raw ?? '').trim());
  if (Number.isInteger(n) && n >= 1 && n <= 12) {
    return String(n) as ClassDisciplineTerm;
  }
  return '1';
}

export function classDisciplineRosterQueryKey(
  tenantId: string | null,
  academicYearId: string | null | undefined,
  classId: string,
  term: ClassDisciplineTerm | number,
) {
  return [
    'class-discipline-roster',
    tenantId,
    academicYearId,
    classId,
    parseClassDisciplineTerm(String(term)),
  ] as const;
}

export function normalizeDisciplineCount(
  value: number | null | undefined,
  max: number,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(max, Math.max(0, Math.trunc(value ?? 0)));
}

export function unenrolledDisciplineStudentIds(
  studentProfileIds: readonly string[],
  enrolledStudentIds: ReadonlySet<string>,
): string[] {
  const unique = [...new Set(studentProfileIds.map((id) => id.trim()).filter(Boolean))];
  return unique.filter((id) => !enrolledStudentIds.has(id));
}

export function canWriteClassDiscipline(input: {
  roleSlug: string;
  staffProfileId?: string | null;
  classMasterStaffProfileId?: string | null;
}): boolean {
  if (canWriteAcademicAdmin(input.roleSlug)) {
    return true;
  }
  if (!isStaffOrTeacher(input.roleSlug)) {
    return false;
  }
  const staffProfileId = input.staffProfileId?.trim() ?? '';
  const classMasterStaffProfileId = input.classMasterStaffProfileId?.trim() ?? '';
  return Boolean(staffProfileId) && staffProfileId === classMasterStaffProfileId;
}

export function aggregateDiscipline(
  rows: readonly ClassDisciplineRow[] | null | undefined,
  term: ReportCardTerm,
): DisciplineInfo {
  const safeRows = rows ?? [];
  const relevant =
    term === 'annual'
      ? safeRows
      : safeRows.filter((entry) => entry.termNumber === Number(term));

  return relevant.reduce(
    (acc, row) => ({
      absences: acc.absences + normalizeDisciplineCount(row.absenceHours, 999),
      suspensions: acc.suspensions + normalizeDisciplineCount(row.suspensions, 99),
      warnings: acc.warnings + normalizeDisciplineCount(row.warnings, 99),
    }),
    { ...EMPTY_DISCIPLINE },
  );
}
