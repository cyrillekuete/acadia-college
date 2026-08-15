import { describe, expect, it } from 'vitest';
import { buildTeacherTeachingScope } from '@/lib/acadia/staff-class-assignments';

describe('buildTeacherTeachingScope', () => {
  it('builds class, subject, and pair lists from class-specific assignments', () => {
    const scope = buildTeacherTeachingScope([
      {
        classId: 'class-a',
        subjectId: 'math',
        className: 'Form 5A',
        subjectName: 'Mathematics',
      },
      {
        classId: 'class-b',
        subjectId: 'english',
        className: 'Form 5B',
        subjectName: 'English',
      },
    ]);

    expect(scope.classIds).toEqual(['class-a', 'class-b']);
    expect(scope.subjectIds).toEqual(['math', 'english']);
    expect(scope.pairs).toHaveLength(2);
  });

  it('keeps Math in 5A without implying Math in 5B', () => {
    const scope = buildTeacherTeachingScope([
      {
        classId: 'class-a',
        subjectId: 'math',
        className: 'Form 5A',
        subjectName: 'Mathematics',
      },
      {
        classId: 'class-b',
        subjectId: 'english',
        className: 'Form 5B',
        subjectName: 'English',
      },
    ]);

    expect(
      scope.pairs.some(
        (pair) => pair.classId === 'class-b' && pair.subjectId === 'math',
      ),
    ).toBe(false);
    expect(
      scope.pairs.some(
        (pair) => pair.classId === 'class-a' && pair.subjectId === 'english',
      ),
    ).toBe(false);
  });

  it('deduplicates multiple matching subjects in the same class', () => {
    const scope = buildTeacherTeachingScope([
      {
        classId: 'class-a',
        subjectId: 'math',
        className: 'Form 5A',
        subjectName: 'Mathematics',
      },
      {
        classId: 'class-a',
        subjectId: 'english',
        className: 'Form 5A',
        subjectName: 'English',
      },
    ]);

    expect(scope.classIds).toEqual(['class-a']);
    expect(scope.subjectIds.sort()).toEqual(['english', 'math']);
    expect(scope.pairs).toHaveLength(2);
  });

  it('deduplicates identical assignment rows', () => {
    const scope = buildTeacherTeachingScope([
      {
        classId: 'class-a',
        subjectId: 'math',
        className: 'Form 5A',
        subjectName: 'Mathematics',
      },
      {
        classId: 'class-a',
        subjectId: 'math',
        className: 'Form 5A',
        subjectName: 'Mathematics',
      },
    ]);

    expect(scope.pairs).toHaveLength(1);
    expect(scope.classIds).toEqual(['class-a']);
    expect(scope.subjectIds).toEqual(['math']);
  });
});
