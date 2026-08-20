import { isAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';

/** Sequence, class, term, and annual reports (admins and teaching staff). */
export function canViewAcademicReports(roleSlug: string | null | undefined): boolean {
  return isAdmin(roleSlug) || isStaffOrTeacher(roleSlug);
}

/** Template preview is available to staff; writes stay academic-admin. */
export function canViewReportCardTemplates(
  roleSlug: string | null | undefined,
): boolean {
  return canViewAcademicReports(roleSlug);
}

/** Stored promotion statement is read-only for class masters and admins. */
export function canViewPromotionStatement(
  roleSlug: string | null | undefined,
): boolean {
  return canViewAcademicReports(roleSlug);
}
