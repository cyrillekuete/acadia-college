import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { unwrapRelation } from '@/lib/acadia/record-display';

export type ClassSubjectEligibilityClass = {
  id: string;
  levelId: string;
  specialtyId?: string | null;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
};

export type ClassSubjectEligibilitySubject = {
  id: string;
  specialtyId: string;
  levelId: string;
  levelIds?: string[];
  academicYearId?: string | null;
  termId?: string | null;
  deactivatedAt?: string | null;
  Specialty?: {
    subSystem?: AcademicSubSystem;
    branch?: AcademicBranch;
  } | null;
  Term?: { academicYearId?: string } | { academicYearId?: string }[] | null;
};

function subjectLevelIds(subject: ClassSubjectEligibilitySubject): string[] {
  if (subject.levelIds && subject.levelIds.length > 0) {
    return subject.levelIds;
  }
  if (subject.levelId) {
    return [subject.levelId];
  }
  return [];
}

function subjectMatchesAcademicYear(
  subject: ClassSubjectEligibilitySubject,
  academicYearId: string | null | undefined,
): boolean {
  if (!academicYearId) {
    return true;
  }
  if (!subject.termId) {
    return subject.academicYearId === academicYearId;
  }
  const term = unwrapRelation<{ academicYearId?: string }>(subject.Term);
  return term?.academicYearId === academicYearId;
}

export function subjectMatchesClass(
  subject: ClassSubjectEligibilitySubject,
  classRow: ClassSubjectEligibilityClass,
  options?: { academicYearId?: string | null },
): boolean {
  if (subject.deactivatedAt) {
    return false;
  }
  if (!subjectMatchesAcademicYear(subject, options?.academicYearId)) {
    return false;
  }

  const levels = subjectLevelIds(subject);
  if (!levels.includes(classRow.levelId)) {
    return false;
  }

  const classSpecialty = classRow.specialtyId?.trim() || '';
  if (classSpecialty && subject.specialtyId !== classSpecialty) {
    return false;
  }

  const specialty = unwrapRelation<{
    subSystem?: AcademicSubSystem;
    branch?: AcademicBranch;
  }>(subject.Specialty);

  if (specialty?.subSystem && specialty.subSystem !== classRow.subSystem) {
    return false;
  }
  if (specialty?.branch && specialty.branch !== classRow.branch) {
    return false;
  }

  return true;
}
