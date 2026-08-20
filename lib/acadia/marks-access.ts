import { isAdmin, isGuardian, isStaffOrTeacher, isStudent } from '@/lib/acadia/roles';

export type MarksViewerScope = {
  /** Unrestricted tenant-wide view (admins). */
  unrestricted: boolean;
  subjectIds: string[] | null;
  studentProfileIds: string[] | null;
  classIds: string[] | null;
};

export function buildMarksViewerScope(input: {
  roleSlug: string | null | undefined;
  teacherSubjectIds?: string[];
  teacherClassIds?: string[];
  teacherStudentProfileIds?: string[];
  ownStudentProfileId?: string | null;
  linkedStudentProfileIds?: string[];
}): MarksViewerScope {
  if (isAdmin(input.roleSlug)) {
    return {
      unrestricted: true,
      subjectIds: null,
      studentProfileIds: null,
      classIds: null,
    };
  }

  if (isStaffOrTeacher(input.roleSlug)) {
    return {
      unrestricted: false,
      subjectIds: input.teacherSubjectIds ?? [],
      studentProfileIds: input.teacherStudentProfileIds ?? [],
      classIds: input.teacherClassIds ?? [],
    };
  }

  if (isStudent(input.roleSlug)) {
    const id = input.ownStudentProfileId?.trim();
    return {
      unrestricted: false,
      subjectIds: null,
      studentProfileIds: id ? [id] : [],
      classIds: null,
    };
  }

  if (isGuardian(input.roleSlug)) {
    return {
      unrestricted: false,
      subjectIds: null,
      studentProfileIds: input.linkedStudentProfileIds ?? [],
      classIds: null,
    };
  }

  return {
    unrestricted: false,
    subjectIds: [],
    studentProfileIds: [],
    classIds: null,
  };
}

export function markRowInScope(
  row: {
    studentProfileId?: string | null;
    subjectId?: string | null;
  },
  scope: MarksViewerScope,
): boolean {
  if (scope.unrestricted) {
    return true;
  }

  const studentId = row.studentProfileId?.trim() ?? '';
  const subjectId = row.subjectId?.trim() ?? '';

  if (scope.studentProfileIds != null && scope.subjectIds != null) {
    const studentOk =
      scope.studentProfileIds.length > 0 &&
      studentId.length > 0 &&
      scope.studentProfileIds.includes(studentId);
    const subjectOk =
      scope.subjectIds.length > 0 &&
      subjectId.length > 0 &&
      scope.subjectIds.includes(subjectId);
    return studentOk || subjectOk;
  }

  if (scope.studentProfileIds != null) {
    return (
      scope.studentProfileIds.length > 0 &&
      studentId.length > 0 &&
      scope.studentProfileIds.includes(studentId)
    );
  }

  if (scope.subjectIds != null) {
    return (
      scope.subjectIds.length > 0 &&
      subjectId.length > 0 &&
      scope.subjectIds.includes(subjectId)
    );
  }

  return false;
}

export function filterSubjectsForTeacherScope<T extends { id: string }>(
  subjects: T[],
  scope: MarksViewerScope,
): T[] {
  if (scope.unrestricted || scope.subjectIds == null) {
    return subjects;
  }
  if (scope.subjectIds.length === 0) {
    return [];
  }
  const allowed = new Set(scope.subjectIds);
  return subjects.filter((subject) => allowed.has(subject.id));
}

export function filterRosterForTeacherScope<
  T extends { id: string; classId: string | null },
>(students: T[], scope: MarksViewerScope): T[] {
  if (scope.unrestricted) {
    return students;
  }
  if (scope.classIds != null && scope.classIds.length > 0) {
    const classes = new Set(scope.classIds);
    const byClass = students.filter(
      (student) => student.classId != null && classes.has(student.classId),
    );
    if (byClass.length > 0 || scope.studentProfileIds == null) {
      return byClass;
    }
  }
  if (scope.studentProfileIds != null) {
    const ids = new Set(scope.studentProfileIds);
    return students.filter((student) => ids.has(student.id));
  }
  return [];
}
