/**
 * Structure CRUD — level/class form schemas and catalog import mapping
 */
import { describe, it, expect } from 'vitest';
import {
  ENGLISH_LEVEL_CATALOG,
  FRENCH_LEVEL_CATALOG,
  levelCatalogForSubSystem,
} from '@/lib/acadia/education-system';
import {
  classFormSchema,
  levelFormSchema,
} from '@/lib/acadia/structure-schemas';
import {
  buildClassDeleteBlockedMessage,
  formatClassDeleteBlockers,
  hasClassDeleteBlockers,
  type ClassDeleteBlockers,
} from '@/lib/supabase/queries/class-delete';
import {
  buildLevelDeleteBlockedMessage,
  canCascadeDeleteClasses,
  formatLevelDeleteBlockers,
  hasNonClassBlockers,
  type LevelDeleteBlockers,
} from '@/lib/supabase/queries/level-delete';

describe('levelFormSchema', () => {
  it('accepts valid level input', () => {
    const result = levelFormSchema.safeParse({
      name: 'Form 5',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = levelFormSchema.safeParse({
      name: '   ',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
    });
    expect(result.success).toBe(false);
  });
});

describe('classFormSchema', () => {
  it('accepts valid class input with subjects', () => {
    const result = classFormSchema.safeParse({
      name: 'Form 5 Science',
      levelId: 'lvl-abc',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      staffProfileId: '',
      status: 'ACTIVE',
      subjectSelections: [{ subjectId: 'sub-1', subBranchIds: null, groupingId: null }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial sub-branch selections', () => {
    const result = classFormSchema.safeParse({
      name: 'Form 5 Science',
      levelId: 'lvl-abc',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      status: 'ACTIVE',
      subjectSelections: [{ subjectId: 'sub-1', subBranchIds: ['sb-1'], groupingId: 'grp-1' }],
    });
    expect(result.success).toBe(true);
  });

  it('requires levelId', () => {
    const result = classFormSchema.safeParse({
      name: 'Form 5 Science',
      levelId: '',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      status: 'ACTIVE',
      subjectSelections: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('levelCatalogForSubSystem (import mapping)', () => {
  it('returns 7 English levels with labelEn used as display name', () => {
    const catalog = levelCatalogForSubSystem('ENGLISH');
    expect(catalog).toHaveLength(7);
    expect(catalog[0].labelEn).toBe('Form 1');
    expect(catalog[6].labelEn).toBe('Upper Sixth');
  });

  it('returns 7 French levels', () => {
    const catalog = levelCatalogForSubSystem('FRENCH');
    expect(catalog).toHaveLength(7);
    expect(catalog[0].labelEn).toBe('Sixième');
    expect(catalog[6].labelEn).toBe('Terminale');
  });

  it('matches static catalog constants', () => {
    expect(levelCatalogForSubSystem('ENGLISH')).toEqual(ENGLISH_LEVEL_CATALOG);
    expect(levelCatalogForSubSystem('FRENCH')).toEqual(FRENCH_LEVEL_CATALOG);
  });
});

const emptyBlockers: LevelDeleteBlockers = {
  classes: 0,
  classEnrollments: 0,
  promotionClassRefs: 0,
  enrollments: 0,
  subjects: 0,
  subjectLevels: 0,
  subjectOfferings: 0,
  terms: 0,
  studentProfiles: 0,
  promotionFrom: 0,
  promotionTarget: 0,
  schemesOfWork: 0,
};

describe('level delete blockers', () => {
  it('allows cascade when only empty classes reference the level', () => {
    expect(
      canCascadeDeleteClasses({ ...emptyBlockers, classes: 3 }),
    ).toBe(true);
  });

  it('blocks cascade when subjects reference the level', () => {
    const blockers = { ...emptyBlockers, classes: 2, subjects: 5 };
    expect(canCascadeDeleteClasses(blockers)).toBe(false);
    expect(hasNonClassBlockers(blockers)).toBe(true);
    expect(formatLevelDeleteBlockers(blockers).join('\n')).toContain('5 subject level link');
  });

  it('builds a multi-line blocked message', () => {
    const message = buildLevelDeleteBlockedMessage({
      ...emptyBlockers,
      subjects: 2,
      enrollments: 1,
    });
    expect(message).toContain('2 subject level link(s) in the catalog');
    expect(message).toContain('1 student enrollment(s) at this level');
  });

  it('blocks cascade when terms reference the level', () => {
    const blockers = { ...emptyBlockers, terms: 2 };
    expect(canCascadeDeleteClasses(blockers)).toBe(false);
    expect(hasNonClassBlockers(blockers)).toBe(true);
    expect(formatLevelDeleteBlockers(blockers)).toContain('2 term record(s)');
  });
});

const emptyClassBlockers: ClassDeleteBlockers = {
  enrollments: 0,
  promotionFrom: 0,
  promotionTarget: 0,
};

describe('class delete blockers', () => {
  it('blocks delete when enrollments reference the class', () => {
    const blockers = { ...emptyClassBlockers, enrollments: 3 };
    expect(hasClassDeleteBlockers(blockers)).toBe(true);
    expect(formatClassDeleteBlockers(blockers)).toContain('3 student enrollment(s)');
  });

  it('blocks delete when promotion decisions reference the class', () => {
    const blockers = { ...emptyClassBlockers, promotionFrom: 2 };
    expect(hasClassDeleteBlockers(blockers)).toBe(true);
    expect(buildClassDeleteBlockedMessage(blockers)).toContain(
      '2 promotion decision(s) for this class',
    );
  });

  it('allows delete when only target promotion refs exist', () => {
    const blockers = { ...emptyClassBlockers, promotionTarget: 1 };
    expect(hasClassDeleteBlockers(blockers)).toBe(false);
    expect(formatClassDeleteBlockers(blockers).join('\n')).toContain('will be cleared on delete');
  });
});
