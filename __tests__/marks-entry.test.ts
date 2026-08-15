import { describe, expect, it } from 'vitest';
import {
  columnsForStudent,
  markDraftKey,
  parseMarkDraftKey,
  resolveMarksEntryColumns,
  resolveStudentBranchIds,
  SUBJECT_MARK_COLUMN,
} from '@/lib/acadia/marks-entry';

const organic = { id: 'org', name: 'Organic' };
const inorganic = { id: 'inorg', name: 'Inorganic' };

describe('markDraftKey', () => {
  it('round-trips subject-level and branch keys', () => {
    expect(parseMarkDraftKey(markDraftKey('stu-1', null))).toEqual({
      studentProfileId: 'stu-1',
      subjectSubBranchId: null,
    });
    expect(parseMarkDraftKey(markDraftKey('stu-1', 'org'))).toEqual({
      studentProfileId: 'stu-1',
      subjectSubBranchId: 'org',
    });
  });
});

describe('resolveMarksEntryColumns', () => {
  it('uses a single subject column when no class has sub-branches', () => {
    expect(
      resolveMarksEntryColumns({
        subBranches: [organic, inorganic],
        assignedByClass: new Map(),
      }),
    ).toEqual([SUBJECT_MARK_COLUMN]);
  });

  it('uses assigned sub-branch columns when classes select papers', () => {
    expect(
      resolveMarksEntryColumns({
        subBranches: [organic, inorganic],
        assignedByClass: new Map([['cls-1', ['org', 'inorg']]]),
        studentClassIds: ['cls-1'],
      }),
    ).toEqual([
      { id: 'org', name: 'Organic' },
      { id: 'inorg', name: 'Inorganic' },
    ]);
  });
});

describe('resolveStudentBranchIds', () => {
  it('returns null for subject-level entry', () => {
    expect(resolveStudentBranchIds('cls-1', new Map())).toBeNull();
    expect(resolveStudentBranchIds(null, new Map([['cls-1', ['org']]]))).toBeNull();
  });

  it('returns the class assignment when present', () => {
    expect(
      resolveStudentBranchIds('cls-1', new Map([['cls-1', ['org']]])),
    ).toEqual(['org']);
  });
});

describe('columnsForStudent', () => {
  const columns = [
    { id: 'org', name: 'Organic' },
    { id: 'inorg', name: 'Inorganic' },
  ];

  it('falls back to a subject column when the class has no papers', () => {
    expect(columnsForStudent(columns, null)).toEqual([SUBJECT_MARK_COLUMN]);
  });

  it('limits columns to the student assignment', () => {
    expect(columnsForStudent(columns, ['org'])).toEqual([
      { id: 'org', name: 'Organic' },
    ]);
  });
});
