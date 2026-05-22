import { describe, expect, it } from 'vitest';
import {
  formatSelectionLabel,
  isGroupingOverridden,
  normalizeSubjectClassAssignments,
  normalizeSubjectSelections,
  resolveEffectiveGrouping,
  selectionsToSubjectIds,
  setAssignmentGrouping,
  setSelectionGrouping,
  toggleFullClass,
  toggleFullSubject,
  toggleSubBranch,
} from '@/lib/acadia/class-subject-selections';
import type { SubjectForClassOption } from '@/hooks/use-subjects-for-class';

const mathSubject: SubjectForClassOption = {
  id: 'sub-math',
  code: 'MATH',
  nameEn: 'Mathematics',
  hasSubBranches: true,
  groupingId: 'grp-core',
  groupingNameEn: 'Core',
  subBranches: [
    { id: 'sb-pure', name: 'Pure Maths', nameFr: null },
    { id: 'sb-applied', name: 'Applied Maths', nameFr: null },
  ],
};

const englishSubject: SubjectForClassOption = {
  id: 'sub-eng',
  code: 'ENG',
  nameEn: 'English',
  hasSubBranches: false,
  groupingId: null,
  groupingNameEn: null,
  subBranches: [],
};

const options = [mathSubject, englishSubject];

describe('selectionsToSubjectIds', () => {
  it('returns parent subject ids', () => {
    expect(
      selectionsToSubjectIds([
        { subjectId: 'sub-math', subBranchIds: ['sb-pure'], groupingId: null },
        { subjectId: 'sub-eng', subBranchIds: null, groupingId: null },
      ]),
    ).toEqual(['sub-math', 'sub-eng']);
  });
});

describe('toggleFullSubject', () => {
  it('adds a full subject selection', () => {
    expect(toggleFullSubject([], 'sub-eng', true)).toEqual([
      { subjectId: 'sub-eng', subBranchIds: null, groupingId: null },
    ]);
  });

  it('removes a subject selection', () => {
    expect(
      toggleFullSubject(
        [{ subjectId: 'sub-eng', subBranchIds: null, groupingId: null }],
        'sub-eng',
        false,
      ),
    ).toEqual([]);
  });
});

describe('toggleSubBranch', () => {
  it('adds a partial branch selection', () => {
    expect(
      toggleSubBranch([], 'sub-math', 'sb-pure', ['sb-pure', 'sb-applied'], true),
    ).toEqual([
      { subjectId: 'sub-math', subBranchIds: ['sb-pure'], groupingId: null },
    ]);
  });

  it('normalizes to full subject when all branches are selected', () => {
    expect(
      toggleSubBranch(
        [{ subjectId: 'sub-math', subBranchIds: ['sb-pure'], groupingId: 'grp-1' }],
        'sub-math',
        'sb-applied',
        ['sb-pure', 'sb-applied'],
        true,
      ),
    ).toEqual([{ subjectId: 'sub-math', subBranchIds: null, groupingId: 'grp-1' }]);
  });

  it('converts full subject to partial when one branch is unchecked', () => {
    expect(
      toggleSubBranch(
        [{ subjectId: 'sub-math', subBranchIds: null, groupingId: null }],
        'sub-math',
        'sb-pure',
        ['sb-pure', 'sb-applied'],
        false,
      ),
    ).toEqual([{ subjectId: 'sub-math', subBranchIds: ['sb-applied'], groupingId: null }]);
  });
});

describe('normalizeSubjectSelections', () => {
  it('drops selections that no longer match available options', () => {
    expect(
      normalizeSubjectSelections(
        [{ subjectId: 'sub-missing', subBranchIds: null, groupingId: null }],
        options,
      ),
    ).toEqual([]);
  });

  it('normalizes all branches to full subject', () => {
    expect(
      normalizeSubjectSelections(
        [{ subjectId: 'sub-math', subBranchIds: ['sb-pure', 'sb-applied'], groupingId: null }],
        options,
      ),
    ).toEqual([{ subjectId: 'sub-math', subBranchIds: null, groupingId: null }]);
  });

  it('keeps partial branch selections and grouping overrides', () => {
    expect(
      normalizeSubjectSelections(
        [{ subjectId: 'sub-math', subBranchIds: ['sb-pure'], groupingId: 'grp-elective' }],
        options,
      ),
    ).toEqual([
      { subjectId: 'sub-math', subBranchIds: ['sb-pure'], groupingId: 'grp-elective' },
    ]);
  });
});

describe('grouping helpers', () => {
  it('resolves effective grouping from override or subject default', () => {
    expect(resolveEffectiveGrouping({ groupingId: 'grp-1' }, 'grp-default')).toBe('grp-1');
    expect(resolveEffectiveGrouping({ groupingId: null }, 'grp-default')).toBe('grp-default');
  });

  it('updates grouping on class-side selections', () => {
    expect(
      setSelectionGrouping(
        [{ subjectId: 'sub-math', subBranchIds: null, groupingId: null }],
        'sub-math',
        'grp-elective',
      ),
    ).toEqual([
      { subjectId: 'sub-math', subBranchIds: null, groupingId: 'grp-elective' },
    ]);
  });

  it('updates grouping on subject-side assignments', () => {
    expect(
      setAssignmentGrouping(
        [{ classId: 'cls-1', subBranchIds: null, groupingId: null }],
        'cls-1',
        'grp-elective',
      ),
    ).toEqual([{ classId: 'cls-1', subBranchIds: null, groupingId: 'grp-elective' }]);
  });

  it('detects grouping overrides', () => {
    expect(isGroupingOverridden({ groupingId: 'grp-1' })).toBe(true);
    expect(isGroupingOverridden({ groupingId: null })).toBe(false);
  });
});

describe('subject-side class toggles', () => {
  it('adds and removes class assignments', () => {
    expect(toggleFullClass([], 'cls-1', true)).toEqual([
      { classId: 'cls-1', subBranchIds: null, groupingId: null },
    ]);
    expect(
      toggleFullClass(
        [{ classId: 'cls-1', subBranchIds: null, groupingId: null }],
        'cls-1',
        false,
      ),
    ).toEqual([]);
  });

  it('normalizes subject-side assignments', () => {
    expect(
      normalizeSubjectClassAssignments(
        [{ classId: 'cls-1', subBranchIds: ['sb-pure', 'sb-applied'], groupingId: 'grp-1' }],
        [{ id: 'cls-1', hasSubBranches: true, subBranches: [{ id: 'sb-pure' }, { id: 'sb-applied' }] }],
      ),
    ).toEqual([{ classId: 'cls-1', subBranchIds: null, groupingId: 'grp-1' }]);
  });
});

describe('formatSelectionLabel', () => {
  it('formats full subject labels', () => {
    expect(
      formatSelectionLabel(englishSubject, {
        subjectId: 'sub-eng',
        subBranchIds: null,
        groupingId: null,
      }),
    ).toBe('ENG — English');
  });

  it('formats partial branch labels', () => {
    expect(
      formatSelectionLabel(mathSubject, {
        subjectId: 'sub-math',
        subBranchIds: ['sb-pure'],
        groupingId: null,
      }),
    ).toBe('MATH (Pure Maths)');
  });

  it('appends grouping override to labels', () => {
    expect(
      formatSelectionLabel(
        mathSubject,
        {
          subjectId: 'sub-math',
          subBranchIds: null,
          groupingId: 'grp-elective',
        },
        new Map([['grp-elective', 'Elective']]),
      ),
    ).toBe('MATH — Mathematics · Elective');
  });
});
