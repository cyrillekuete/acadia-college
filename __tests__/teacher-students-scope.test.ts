import { describe, expect, it } from 'vitest';
import { resolveTeacherTeachingClassIds } from '@/lib/supabase/queries/teacher-students';

describe('resolveTeacherTeachingClassIds', () => {
  it('returns classes where teacher assignments overlap with ClassSubject', () => {
    const classIds = resolveTeacherTeachingClassIds({
      assignedClassIds: ['class-a', 'class-b'],
      assignedSubjectIds: ['math', 'english'],
      classSubjectPairs: [
        { classId: 'class-a', subjectId: 'math' },
        { classId: 'class-a', subjectId: 'physics' },
        { classId: 'class-b', subjectId: 'english' },
        { classId: 'class-c', subjectId: 'math' },
      ],
    });

    expect(classIds.sort()).toEqual(['class-a', 'class-b']);
  });

  it('excludes classes assigned to teacher without matching ClassSubject', () => {
    const classIds = resolveTeacherTeachingClassIds({
      assignedClassIds: ['class-a'],
      assignedSubjectIds: ['math'],
      classSubjectPairs: [{ classId: 'class-a', subjectId: 'english' }],
    });

    expect(classIds).toEqual([]);
  });

  it('excludes ClassSubject pairs for classes not assigned to teacher', () => {
    const classIds = resolveTeacherTeachingClassIds({
      assignedClassIds: ['class-a'],
      assignedSubjectIds: ['math'],
      classSubjectPairs: [{ classId: 'class-b', subjectId: 'math' }],
    });

    expect(classIds).toEqual([]);
  });

  it('deduplicates multiple matching subjects in the same class', () => {
    const classIds = resolveTeacherTeachingClassIds({
      assignedClassIds: ['class-a'],
      assignedSubjectIds: ['math', 'english'],
      classSubjectPairs: [
        { classId: 'class-a', subjectId: 'math' },
        { classId: 'class-a', subjectId: 'english' },
      ],
    });

    expect(classIds).toEqual(['class-a']);
  });
});
