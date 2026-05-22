import { canWriteRegistry, isStaffOrTeacher, isStudent } from '@/lib/acadia/roles';

export type TimetableViewMode = 'admin' | 'teacher' | 'student' | 'browse';

export function resolveTimetableViewMode(
  roleSlug: string | null | undefined,
): TimetableViewMode {
  if (canWriteRegistry(roleSlug)) {
    return 'admin';
  }
  if (isStudent(roleSlug)) {
    return 'student';
  }
  if (isStaffOrTeacher(roleSlug)) {
    return 'teacher';
  }
  return 'browse';
}

export function timetableViewDescription(mode: TimetableViewMode): string {
  switch (mode) {
    case 'admin':
      return 'Manage weekly timetables by class — subjects, teachers, and rooms.';
    case 'teacher':
      return 'Your teaching schedule across all assigned classes.';
    case 'student':
      return 'Your class timetable for the active academic year.';
    case 'browse':
      return 'Browse weekly timetables by class.';
  }
}
