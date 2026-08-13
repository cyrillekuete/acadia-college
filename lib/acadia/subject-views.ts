import { isStudent } from '@/lib/acadia/roles';

export type SubjectsViewMode = 'student' | 'catalog';

export function resolveSubjectsViewMode(
  roleSlug: string | null | undefined,
): SubjectsViewMode {
  if (isStudent(roleSlug)) {
    return 'student';
  }
  return 'catalog';
}

export function subjectsViewDescription(mode: SubjectsViewMode): string {
  switch (mode) {
    case 'student':
      return 'Subjects assigned to your class for the current academic year.';
    case 'catalog':
      return 'Subject catalog for the academic year.';
  }
}
