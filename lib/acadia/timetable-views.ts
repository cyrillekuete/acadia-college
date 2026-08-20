import { canWriteRegistry, isGuardian, isStaffOrTeacher, isStudent } from '@/lib/acadia/roles';

export type TimetableViewMode = 'admin' | 'teacher' | 'student' | 'guardian' | 'browse';

export function resolveTimetableViewMode(
  roleSlug: string | null | undefined,
): TimetableViewMode {
  if (canWriteRegistry(roleSlug)) {
    return 'admin';
  }
  if (isStudent(roleSlug)) {
    return 'student';
  }
  if (isGuardian(roleSlug)) {
    return 'guardian';
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
    case 'guardian':
      return 'Weekly timetables for your linked students.';
    case 'browse':
      return 'Browse weekly timetables by class.';
  }
}
