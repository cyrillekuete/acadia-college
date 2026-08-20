import { isAdmin, isStaffOrTeacher, isStudent } from '@/lib/acadia/roles';

export type SubjectsViewMode = 'student' | 'catalog' | 'restricted';

export function resolveSubjectsViewMode(
  roleSlug: string | null | undefined,
): SubjectsViewMode {
  if (isStudent(roleSlug)) {
    return 'student';
  }
  if (isAdmin(roleSlug) || isStaffOrTeacher(roleSlug)) {
    return 'catalog';
  }
  return 'restricted';
}

export function subjectsViewDescription(mode: SubjectsViewMode): string {
  switch (mode) {
    case 'student':
      return 'Subjects assigned to your class for the current academic year.';
    case 'catalog':
      return 'Subject catalog for the academic year.';
    case 'restricted':
      return 'Subject catalog is available to school staff.';
  }
}
