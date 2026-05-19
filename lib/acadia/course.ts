import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import type { CourseFormValues } from '@/lib/acadia/course-schemas';

export function buildCourseRow(
  tenantId: string,
  id: string,
  values: CourseFormValues,
  now: string,
) {
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
    deactivatedAt: null as string | null,
    updatedAt: now,
  };
}

export type CourseRecordInput = CourseFormValues & {
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
};

export function canEditCourse(deactivatedAt: string | null | undefined): boolean {
  return !deactivatedAt;
}
