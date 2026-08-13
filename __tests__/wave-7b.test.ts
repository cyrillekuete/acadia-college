/**
 * Wave 7B unit tests
 * Covers: education-system.ts (sub-systems, branches, label helpers, catalog filters)
 */
import { describe, it, expect } from 'vitest';
import {
  ACADEMIC_SUB_SYSTEMS,
  ACADEMIC_BRANCHES,
  EMPTY_CATALOG_FILTERS,
  ENGLISH_LEVEL_CATALOG,
  FRENCH_LEVEL_CATALOG,
  levelCatalogForSubSystem,
  subSystemLabel,
  branchLabel,
  streamLabel,
  levelDisplayLabel,
  rowMatchesCatalogFilters,
} from '@/lib/acadia/education-system';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('ACADEMIC_SUB_SYSTEMS', () => {
  it('contains exactly ENGLISH and FRENCH', () => {
    expect(ACADEMIC_SUB_SYSTEMS).toEqual(['ENGLISH', 'FRENCH']);
  });
});

describe('ACADEMIC_BRANCHES', () => {
  it('contains GRAMMAR, TECHNICAL, COMMERCIAL', () => {
    expect(ACADEMIC_BRANCHES).toEqual(['GRAMMAR', 'TECHNICAL', 'COMMERCIAL']);
  });
});

describe('EMPTY_CATALOG_FILTERS', () => {
  it('has null subSystem and branch', () => {
    expect(EMPTY_CATALOG_FILTERS).toEqual({ subSystem: null, branch: null });
  });
});

// ---------------------------------------------------------------------------
// Level catalogs
// ---------------------------------------------------------------------------
describe('ENGLISH_LEVEL_CATALOG', () => {
  it('has 7 levels', () => expect(ENGLISH_LEVEL_CATALOG).toHaveLength(7));

  it('starts with Form 1 at number 1, sortOrder 1', () => {
    expect(ENGLISH_LEVEL_CATALOG[0]).toEqual({
      number: 1,
      labelEn: 'Form 1',
      labelFr: 'Form 1',
      sortOrder: 1,
    });
  });

  it('ends with Upper Sixth at number 7', () => {
    const last = ENGLISH_LEVEL_CATALOG[ENGLISH_LEVEL_CATALOG.length - 1];
    expect(last.labelEn).toBe('Upper Sixth');
    expect(last.number).toBe(7);
  });

  it('has strictly increasing sortOrder', () => {
    for (let i = 1; i < ENGLISH_LEVEL_CATALOG.length; i++) {
      expect(ENGLISH_LEVEL_CATALOG[i].sortOrder).toBeGreaterThan(
        ENGLISH_LEVEL_CATALOG[i - 1].sortOrder,
      );
    }
  });
});

describe('FRENCH_LEVEL_CATALOG', () => {
  it('has 7 levels', () => expect(FRENCH_LEVEL_CATALOG).toHaveLength(7));

  it('starts with Sixième', () => {
    expect(FRENCH_LEVEL_CATALOG[0].labelFr).toBe('Sixième');
  });

  it('ends with Terminale', () => {
    const last = FRENCH_LEVEL_CATALOG[FRENCH_LEVEL_CATALOG.length - 1];
    expect(last.labelFr).toBe('Terminale');
  });

  it('has strictly increasing sortOrder', () => {
    for (let i = 1; i < FRENCH_LEVEL_CATALOG.length; i++) {
      expect(FRENCH_LEVEL_CATALOG[i].sortOrder).toBeGreaterThan(
        FRENCH_LEVEL_CATALOG[i - 1].sortOrder,
      );
    }
  });
});

describe('levelCatalogForSubSystem', () => {
  it('returns FRENCH catalog for FRENCH', () => {
    expect(levelCatalogForSubSystem('FRENCH')).toBe(FRENCH_LEVEL_CATALOG);
  });

  it('returns ENGLISH catalog for ENGLISH', () => {
    expect(levelCatalogForSubSystem('ENGLISH')).toBe(ENGLISH_LEVEL_CATALOG);
  });
});

// ---------------------------------------------------------------------------
// Academic streams (sub-system × branch)
// ---------------------------------------------------------------------------
describe('academic stream combinations', () => {
  it('has 6 streams (2 sub-systems × 3 branches)', () => {
    const combinations = ACADEMIC_SUB_SYSTEMS.flatMap((subSystem) =>
      ACADEMIC_BRANCHES.map((branch) => ({ subSystem, branch })),
    );
    expect(combinations).toHaveLength(6);
  });

  it('covers every sub-system × branch combination exactly once', () => {
    const keys = ACADEMIC_SUB_SYSTEMS.flatMap((subSystem) =>
      ACADEMIC_BRANCHES.map((branch) => `${subSystem}:${branch}`),
    );
    const unique = new Set(keys);
    expect(unique.size).toBe(6);
    expect(unique.has('ENGLISH:GRAMMAR')).toBe(true);
    expect(unique.has('ENGLISH:TECHNICAL')).toBe(true);
    expect(unique.has('ENGLISH:COMMERCIAL')).toBe(true);
    expect(unique.has('FRENCH:GRAMMAR')).toBe(true);
    expect(unique.has('FRENCH:TECHNICAL')).toBe(true);
    expect(unique.has('FRENCH:COMMERCIAL')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------
describe('subSystemLabel', () => {
  it('returns human label for ENGLISH', () => {
    expect(subSystemLabel('ENGLISH')).toBe('English sub-system');
  });

  it('returns human label for FRENCH', () => {
    expect(subSystemLabel('FRENCH')).toBe('French sub-system');
  });

  it('returns "—" for null', () => expect(subSystemLabel(null)).toBe('—'));
  it('returns "—" for undefined', () => expect(subSystemLabel(undefined)).toBe('—'));
  it('returns "—" for empty string', () => expect(subSystemLabel('')).toBe('—'));

  it('returns the raw value for an unknown code', () => {
    expect(subSystemLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});

describe('branchLabel', () => {
  it('returns "Grammar" for GRAMMAR', () => expect(branchLabel('GRAMMAR')).toBe('Grammar'));
  it('returns "Technical" for TECHNICAL', () => expect(branchLabel('TECHNICAL')).toBe('Technical'));
  it('returns "Commercial" for COMMERCIAL', () => expect(branchLabel('COMMERCIAL')).toBe('Commercial'));
  it('returns "—" for null', () => expect(branchLabel(null)).toBe('—'));
  it('returns "—" for undefined', () => expect(branchLabel(undefined)).toBe('—'));
  it('returns "—" for empty string', () => expect(branchLabel('')).toBe('—'));
  it('returns the raw value for an unknown code', () => {
    expect(branchLabel('ARTS')).toBe('ARTS');
  });
});

describe('streamLabel', () => {
  it('combines sub-system and branch with a dot separator', () => {
    expect(streamLabel('ENGLISH', 'GRAMMAR')).toBe(
      'English sub-system · Grammar',
    );
  });

  it('returns "—" when both are null', () => {
    expect(streamLabel(null, null)).toBe('—');
  });

  it('returns sub-system label when branch is missing', () => {
    expect(streamLabel('FRENCH', null)).toBe('French sub-system');
  });

  it('returns branch label when sub-system is missing', () => {
    expect(streamLabel(null, 'TECHNICAL')).toBe('Technical');
  });

  it('returns "—" when both are empty strings', () => {
    expect(streamLabel('', '')).toBe('—');
  });
});

// ---------------------------------------------------------------------------
// levelDisplayLabel
// ---------------------------------------------------------------------------
describe('levelDisplayLabel', () => {
  it('returns labelEn if present', () => {
    expect(levelDisplayLabel({ number: 1, labelEn: 'Form 1', labelFr: 'Form 1' })).toBe('Form 1');
  });

  it('falls back to labelFr when labelEn is empty', () => {
    expect(levelDisplayLabel({ number: 1, labelEn: '', labelFr: 'Sixième' })).toBe('Sixième');
  });

  it('prefers labelFr when locale is French', () => {
    expect(
      levelDisplayLabel(
        { number: 1, labelEn: 'Form 1', labelFr: 'Sixième' },
        'fr',
      ),
    ).toBe('Sixième');
  });

  it('falls back to "Level N" when no label text', () => {
    expect(levelDisplayLabel({ number: 3 })).toBe('Level 3');
  });

  it('returns "—" for null', () => {
    expect(levelDisplayLabel(null)).toBe('—');
  });

  it('returns "—" when number is absent and no label text', () => {
    expect(levelDisplayLabel({})).toBe('—');
  });

  it('trims whitespace before using label', () => {
    expect(levelDisplayLabel({ number: 1, labelEn: '  Form 1  ' })).toBe('Form 1');
  });
});

// ---------------------------------------------------------------------------
// rowMatchesCatalogFilters
// ---------------------------------------------------------------------------
describe('rowMatchesCatalogFilters', () => {
  const makeRow = (subSystem?: string, branch?: string) => ({ subSystem, branch });

  it('returns true when both filters are null (empty filters)', () => {
    expect(
      rowMatchesCatalogFilters(makeRow('ENGLISH', 'GRAMMAR'), EMPTY_CATALOG_FILTERS),
    ).toBe(true);
  });

  it('returns true when row matches the subSystem filter', () => {
    expect(
      rowMatchesCatalogFilters(makeRow('FRENCH', 'GRAMMAR'), {
        subSystem: 'FRENCH',
        branch: null,
      }),
    ).toBe(true);
  });

  it('returns false when row does NOT match the subSystem filter', () => {
    expect(
      rowMatchesCatalogFilters(makeRow('ENGLISH', 'GRAMMAR'), {
        subSystem: 'FRENCH',
        branch: null,
      }),
    ).toBe(false);
  });

  it('returns true when row matches the branch filter', () => {
    expect(
      rowMatchesCatalogFilters(makeRow('ENGLISH', 'TECHNICAL'), {
        subSystem: null,
        branch: 'TECHNICAL',
      }),
    ).toBe(true);
  });

  it('returns false when row does NOT match the branch filter', () => {
    expect(
      rowMatchesCatalogFilters(makeRow('ENGLISH', 'GRAMMAR'), {
        subSystem: null,
        branch: 'COMMERCIAL',
      }),
    ).toBe(false);
  });

  it('returns true when row matches both filters', () => {
    expect(
      rowMatchesCatalogFilters(makeRow('FRENCH', 'COMMERCIAL'), {
        subSystem: 'FRENCH',
        branch: 'COMMERCIAL',
      }),
    ).toBe(true);
  });

  it('returns false when subSystem matches but branch does not', () => {
    expect(
      rowMatchesCatalogFilters(makeRow('FRENCH', 'GRAMMAR'), {
        subSystem: 'FRENCH',
        branch: 'TECHNICAL',
      }),
    ).toBe(false);
  });

  it('returns true for a row with no catalog fields when filters are empty', () => {
    expect(rowMatchesCatalogFilters({}, EMPTY_CATALOG_FILTERS)).toBe(true);
  });

  it('returns false for a row with no catalog fields when a filter is active', () => {
    expect(
      rowMatchesCatalogFilters({}, { subSystem: 'ENGLISH', branch: null }),
    ).toBe(false);
  });
});
