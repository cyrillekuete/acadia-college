import { describe, expect, it } from 'vitest';
import {
  buildMarksViewerScope,
  filterRosterForTeacherScope,
  filterSubjectsForTeacherScope,
  markRowInScope,
} from '@/lib/acadia/marks-access';

describe('marks access scope', () => {
  it('gives admins unrestricted access', () => {
    const scope = buildMarksViewerScope({ roleSlug: 'admin' });
    expect(scope.unrestricted).toBe(true);
    expect(markRowInScope({ studentProfileId: 'any', subjectId: 'any' }, scope)).toBe(
      true,
    );
  });

  it('scopes teachers to assigned subjects or students', () => {
    const scope = buildMarksViewerScope({
      roleSlug: 'teacher',
      teacherSubjectIds: ['math'],
      teacherClassIds: ['class-a'],
      teacherStudentProfileIds: ['stu-1'],
    });
    expect(markRowInScope({ studentProfileId: 'stu-1', subjectId: 'other' }, scope)).toBe(
      true,
    );
    expect(markRowInScope({ studentProfileId: 'other', subjectId: 'math' }, scope)).toBe(
      true,
    );
    expect(markRowInScope({ studentProfileId: 'other', subjectId: 'other' }, scope)).toBe(
      false,
    );
  });

  it('scopes students to their own profile', () => {
    const scope = buildMarksViewerScope({
      roleSlug: 'student',
      ownStudentProfileId: 'me',
    });
    expect(markRowInScope({ studentProfileId: 'me', subjectId: 'math' }, scope)).toBe(
      true,
    );
    expect(markRowInScope({ studentProfileId: 'other', subjectId: 'math' }, scope)).toBe(
      false,
    );
  });

  it('filters subjects and roster for teachers', () => {
    const scope = buildMarksViewerScope({
      roleSlug: 'teacher',
      teacherSubjectIds: ['math'],
      teacherClassIds: ['class-a'],
      teacherStudentProfileIds: ['stu-1'],
    });
    expect(
      filterSubjectsForTeacherScope(
        [
          { id: 'math', code: 'MATH' },
          { id: 'eng', code: 'ENG' },
        ],
        scope,
      ).map((row) => row.id),
    ).toEqual(['math']);
    expect(
      filterRosterForTeacherScope(
        [
          { id: 'stu-1', classId: 'class-a' },
          { id: 'stu-2', classId: 'class-b' },
        ],
        scope,
      ).map((row) => row.id),
    ).toEqual(['stu-1']);
  });
});
