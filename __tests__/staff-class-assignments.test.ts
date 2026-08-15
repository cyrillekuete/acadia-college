import { describe, expect, it } from 'vitest';
import {
  classSubjectPairsForSelection,
  hasClassTeacherSubjects,
  uniqueIds,
  validateSubjectIdsOfferedInClass,
} from '@/lib/acadia/staff-class-assignments';

describe('validateSubjectIdsOfferedInClass', () => {
  it('accepts subjects offered in the class', () => {
    expect(
      validateSubjectIdsOfferedInClass(['math', 'english'], ['english', 'math']),
    ).toEqual(['english', 'math']);
  });

  it('rejects subjects that are not on the class', () => {
    expect(() =>
      validateSubjectIdsOfferedInClass(['math'], ['math', 'physics']),
    ).toThrow('One or more subjects are not assigned to this class.');
  });

  it('deduplicates and trims requested ids', () => {
    expect(
      validateSubjectIdsOfferedInClass(['math', 'english'], [' math ', 'math', '']),
    ).toEqual(['math']);
  });
});

describe('classSubjectPairsForSelection', () => {
  it('returns only offered pairs for the selected classes and subjects', () => {
    const pairs = classSubjectPairsForSelection({
      classIds: ['class-a', 'class-b'],
      subjectIds: ['math', 'english'],
      offeredPairs: [
        { classId: 'class-a', subjectId: 'math' },
        { classId: 'class-a', subjectId: 'physics' },
        { classId: 'class-b', subjectId: 'english' },
        { classId: 'class-c', subjectId: 'math' },
      ],
    });

    expect(pairs).toEqual([
      { classId: 'class-a', subjectId: 'math' },
      { classId: 'class-b', subjectId: 'english' },
    ]);
  });

  it('does not create pairs for another class when removing one assignment', () => {
    const remaining = classSubjectPairsForSelection({
      classIds: ['class-b'],
      subjectIds: ['math', 'english'],
      offeredPairs: [
        { classId: 'class-a', subjectId: 'math' },
        { classId: 'class-b', subjectId: 'english' },
      ],
    });

    expect(remaining).toEqual([{ classId: 'class-b', subjectId: 'english' }]);
    expect(remaining.some((pair) => pair.classId === 'class-a')).toBe(false);
  });
});

describe('uniqueIds', () => {
  it('removes blanks and duplicates', () => {
    expect(uniqueIds(['a', ' a ', '', 'b', 'a'])).toEqual(['a', 'b']);
  });
});

describe('hasClassTeacherSubjects', () => {
  it('requires at least one real subject id', () => {
    expect(hasClassTeacherSubjects([])).toBe(false);
    expect(hasClassTeacherSubjects(['', '  '])).toBe(false);
    expect(hasClassTeacherSubjects(['math'])).toBe(true);
  });
});
