import { canWriteAcademicAdmin, canWriteOperations, isStudent } from '@/lib/acadia/roles';

/** Default max score when creating graded coursework materials. */
export const DEFAULT_COURSEWORK_MAX_SCORE = 20;

export function requiresPositiveMaxScore(isPublished: boolean, maxScore: number): boolean {
  return isPublished && maxScore < 1;
}

/** Student lists show published tasks only; staff/ops see drafts too. */
export function courseworkTaskListFilters(roleSlug: string | null | undefined): Array<{
  column: string;
  value: string | number | boolean;
}> {
  if (isStudent(roleSlug)) {
    return [{ column: 'isPublished', value: true }];
  }
  return [];
}

/** Matches CourseworkTask staff write RLS (ops staff + academic admin; not bursar-only). */
export function canManageCourseworkMaterials(
  roleSlug: string | null | undefined,
): boolean {
  if (isBursar(roleSlug)) {
    return false;
  }
  return canWriteAcademicAdmin(roleSlug) || canWriteOperations(roleSlug);
}

function isBursar(roleSlug: string | null | undefined): boolean {
  return (roleSlug?.toLowerCase() ?? '') === 'bursar';
}

export function materialHasSubmissionsMessage(count: number): string {
  if (count <= 0) {
    return 'This material has student submissions and cannot be deleted.';
  }
  return `This material has ${count} submission${count === 1 ? '' : 's'} and cannot be deleted.`;
}
