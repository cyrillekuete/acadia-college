import { isAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';
import type { DisciplineInfo, ReportCardTerm } from '@/lib/acadia/report-card-types';

export const CLASS_DISCIPLINE_TERMS = ['1', '2', '3'] as const;

export type ClassDisciplineTerm = (typeof CLASS_DISCIPLINE_TERMS)[number];

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
  if (raw === '1' || raw === '2' || raw === '3') {
    return raw;
  }
  return '1';
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

export function canWriteClassDiscipline(input: {
  roleSlug: string;
  staffProfileId?: string | null;
  classMasterStaffProfileId?: string | null;
}): boolean {
  if (isAdmin(input.roleSlug)) {
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
