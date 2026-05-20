import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import type { SubjectFormValues } from '@/lib/acadia/subject-schemas';

export function buildSubjectRow(
  tenantId: string,
  id: string,
  values: SubjectFormValues,
  now: string,
) {
  const groupingId = values.groupingId?.trim() || null;
  return {
    id,
    tenantId,
    code: values.code.trim().toUpperCase(),
    nameEn: values.nameEn.trim(),
    nameFr: values.nameFr.trim(),
    credits: values.credits,
    hours: values.hours,
    specialtyId: values.specialtyId,
    levelId: values.levelId,
    termId: values.termId,
    subjectType: values.subjectType,
    coefficient: values.coefficient,
    groupingId,
    hasSubBranches: values.hasSubBranches,
    deactivatedAt: null as string | null,
    updatedAt: now,
  };
}

export type SubjectRecordInput = SubjectFormValues & {
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
};

export function canEditSubject(deactivatedAt: string | null | undefined): boolean {
  return !deactivatedAt;
}

export function normalizeGroupingId(groupingId: string | undefined | null): string | null {
  const trimmed = groupingId?.trim();
  return trimmed ? trimmed : null;
}
