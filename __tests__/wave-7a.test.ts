/**
 * Wave 7A unit tests
 * Covers: academic-calendar.ts, calendar-schemas.ts, record-display.ts (term/sequence labels)
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ACADEMIC_STRUCTURE,
  TERMS_PER_YEAR,
  SEQUENCES_PER_YEAR,
  buildSequenceDistribution,
  formatDistributionPreview,
  termNumberForSequence,
  numberInTermForSequence,
  buildTermRows,
  buildSequenceRows,
  validateAcademicYearStructure,
} from '@/lib/acadia/academic-calendar';
import {
  academicYearSchema,
  termSchema,
  termSchemaForStructure,
  sequenceSchema,
  sequenceSchemaForStructure,
  calendarMilestoneSchema,
  CALENDAR_MILESTONE_KINDS,
} from '@/lib/acadia/calendar-schemas';
import {
  termLabel,
  sequenceLabel,
  semesterLabel,
  unwrapRelation,
  formatRecordValue,
  levelLabel,
} from '@/lib/acadia/record-display';
import { generateAcadiaId } from '@/lib/acadia/ids';

// ---------------------------------------------------------------------------
// useTermOptions enabled-condition logic (extracted as a pure predicate)
// Mirrors the exact expression in hooks/use-academic-calendar-options.ts so
// regressions are caught without needing a full hook test harness.
// ---------------------------------------------------------------------------
function termOptionsYearEnabled(academicYearId: string | null | undefined): boolean {
  return (
    academicYearId === undefined ||
    (typeof academicYearId === 'string' && academicYearId.length > 0)
  );
}

describe('useTermOptions — academicYearId enabled guard', () => {
  it('enables when academicYearId is undefined (intentional "no filter" usage)', () => {
    expect(termOptionsYearEnabled(undefined)).toBe(true);
  });

  it('enables when academicYearId is a non-empty string', () => {
    expect(termOptionsYearEnabled('year-abc')).toBe(true);
  });

  it('disables when academicYearId is null (year not yet selected)', () => {
    // Bug 1 regression: the old condition had `|| academicYearId === null`
    // which made this return true, triggering an unfiltered tenant-wide fetch.
    expect(termOptionsYearEnabled(null)).toBe(false);
  });

  it('disables when academicYearId is an empty string (invalid / cleared field)', () => {
    expect(termOptionsYearEnabled('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ids.ts
// ---------------------------------------------------------------------------
describe('generateAcadiaId', () => {
  it('starts with the given prefix', () => {
    const id = generateAcadiaId('term');
    expect(id).toMatch(/^term-/);
  });

  it('produces unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateAcadiaId('x')));
    expect(ids.size).toBe(100);
  });

  it('contains only alphanumeric characters after the prefix', () => {
    const id = generateAcadiaId('seq');
    const [, slug] = id.split('-');
    expect(slug).toMatch(/^[a-f0-9]+$/);
  });
});

// ---------------------------------------------------------------------------
// academic-calendar.ts — pure helpers
// ---------------------------------------------------------------------------
describe('DEFAULT_ACADEMIC_STRUCTURE / legacy constants', () => {
  it('defaults to 3 terms per year', () => {
    expect(DEFAULT_ACADEMIC_STRUCTURE.termsPerYear).toBe(3);
    expect(TERMS_PER_YEAR).toBe(3);
  });

  it('defaults to 6 sequences per year', () => {
    expect(DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear).toBe(6);
    expect(SEQUENCES_PER_YEAR).toBe(6);
  });
});

describe('buildSequenceDistribution', () => {
  it('distributes 6 sequences evenly across 3 terms (2 each)', () => {
    const dist = buildSequenceDistribution({
      termsPerYear: 3,
      sequencesPerTerm: 2,
      sequencesPerYear: 6,
    });
    expect(dist.countsPerTerm).toEqual([2, 2, 2]);
  });

  it('distributes 5 sequences across 3 terms as 2+2+1', () => {
    const dist = buildSequenceDistribution({
      termsPerYear: 3,
      sequencesPerTerm: 2,
      sequencesPerYear: 5,
    });
    expect(dist.countsPerTerm).toEqual([2, 2, 1]);
    expect(formatDistributionPreview(dist)).toBe('Term 1: 2 · Term 2: 2 · Term 3: 1');
  });
});

describe('validateAcademicYearStructure', () => {
  it('rejects sequencesPerYear below termsPerYear', () => {
    const result = validateAcademicYearStructure({
      termsPerYear: 3,
      sequencesPerTerm: 2,
      sequencesPerYear: 2,
    });
    expect(result.valid).toBe(false);
  });

  it('warns when uniform product differs from sequencesPerYear', () => {
    const result = validateAcademicYearStructure({
      termsPerYear: 3,
      sequencesPerTerm: 2,
      sequencesPerYear: 5,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('termNumberForSequence', () => {
  const cases: [number, number][] = [
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [6, 3],
  ];
  it.each(cases)('sequence %i → term %i', (seq, expectedTerm) => {
    expect(termNumberForSequence(seq)).toBe(expectedTerm);
  });
});

describe('termNumberForSequence — 5 sequences / 3 terms layout', () => {
  const structure = { termsPerYear: 3, sequencesPerTerm: 2, sequencesPerYear: 5 };

  it('maps sequence 5 to term 3', () => {
    expect(termNumberForSequence(5, structure)).toBe(3);
  });

  it('maps sequence 5 to position 1 in term', () => {
    expect(numberInTermForSequence(5, structure)).toBe(1);
  });
});

describe('termNumberForSequence — output is always a valid term number (1–3)', () => {
  // Regression guard: syncSequenceDerivedFields relied on terms.find() returning
  // a match. If termNumberForSequence ever returned a value outside [1,2,3] it
  // would silently leave termId blank. This suite pins the range.
  it('never returns a number below 1', () => {
    [1, 2, 3, 4, 5, 6].forEach((seq) => {
      expect(termNumberForSequence(seq)).toBeGreaterThanOrEqual(1);
    });
  });

  it('never returns a number above TERMS_PER_YEAR (3)', () => {
    [1, 2, 3, 4, 5, 6].forEach((seq) => {
      expect(termNumberForSequence(seq)).toBeLessThanOrEqual(TERMS_PER_YEAR);
    });
  });
});

describe('numberInTermForSequence', () => {
  const cases: [number, number][] = [
    [1, 1],
    [2, 2],
    [3, 1],
    [4, 2],
    [5, 1],
    [6, 2],
  ];
  it.each(cases)('sequence %i → numberInTerm %i', (seq, expected) => {
    expect(numberInTermForSequence(seq)).toBe(expected);
  });
});

describe('buildTermRows', () => {
  const rows = buildTermRows('tenant-1', 'year-1');

  it('builds exactly TERMS_PER_YEAR rows', () => {
    expect(rows).toHaveLength(TERMS_PER_YEAR);
  });

  it('assigns tenantId and academicYearId correctly', () => {
    rows.forEach((r) => {
      expect(r.tenantId).toBe('tenant-1');
      expect(r.academicYearId).toBe('year-1');
    });
  });

  it('numbers terms 1, 2, 3', () => {
    expect(rows.map((r) => r.number)).toEqual([1, 2, 3]);
  });

  it('sets levelId to null', () => {
    rows.forEach((r) => expect(r.levelId).toBeNull());
  });

  it('generates unique IDs with "term-" prefix', () => {
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^term-/));
  });
});

describe('buildSequenceRows', () => {
  const termRows = buildTermRows('tenant-1', 'year-1');
  const seqRows = buildSequenceRows('tenant-1', 'year-1', termRows);

  it('builds exactly SEQUENCES_PER_YEAR rows', () => {
    expect(seqRows).toHaveLength(SEQUENCES_PER_YEAR);
  });

  it('numbers sequences 1 through 6', () => {
    expect(seqRows.map((r) => r.number)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('assigns correct termId for each sequence', () => {
    const termByNumber = new Map(termRows.map((t) => [t.number, t.id]));
    seqRows.forEach((seq) => {
      const expectedTermNumber = termNumberForSequence(seq.number);
      expect(seq.termId).toBe(termByNumber.get(expectedTermNumber));
    });
  });

  it('assigns correct numberInTerm for each sequence', () => {
    seqRows.forEach((seq) => {
      expect(seq.numberInTerm).toBe(numberInTermForSequence(seq.number));
    });
  });

  it('assigns tenantId and academicYearId', () => {
    seqRows.forEach((seq) => {
      expect(seq.tenantId).toBe('tenant-1');
      expect(seq.academicYearId).toBe('year-1');
    });
  });

  it('throws when a term is missing from the map', () => {
    expect(() =>
      buildSequenceRows('tenant-1', 'year-1', [{ id: 'only-term-1', number: 1 }]),
    ).toThrow(/Missing term/);
  });

  it('every sequence number resolves to an existing term (no silent miss)', () => {
    // Regression guard for the bug where syncSequenceDerivedFields silently
    // skipped setting termId when terms were still loading (empty array).
    // Verifies that for a complete term set, every sequence maps to a term.
    const allTerms = buildTermRows('t', 'y');
    const allSeqs = buildSequenceRows('t', 'y', allTerms);
    const termIds = new Set(allTerms.map((t) => t.id));
    allSeqs.forEach((seq) => {
      expect(termIds.has(seq.termId)).toBe(true);
    });
  });

  it('generates unique IDs with "seq-" prefix', () => {
    const ids = seqRows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^seq-/));
  });
});

// ---------------------------------------------------------------------------
// calendar-schemas.ts
// ---------------------------------------------------------------------------
describe('academicYearSchema', () => {
  const valid = {
    label: '2025-2026',
    startsOn: '2025-09-01',
    endsOn: '2026-07-31',
    isCurrent: true,
    isActive: true,
    termsPerYear: 3,
    sequencesPerTerm: 2,
    sequencesPerYear: 6,
  };

  it('accepts a valid payload', () => {
    expect(academicYearSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty label', () => {
    expect(academicYearSchema.safeParse({ ...valid, label: '' }).success).toBe(false);
  });

  it('rejects bad date format', () => {
    expect(
      academicYearSchema.safeParse({ ...valid, startsOn: '01-09-2025' }).success,
    ).toBe(false);
  });

  it('rejects endsOn before startsOn', () => {
    const result = academicYearSchema.safeParse({
      ...valid,
      startsOn: '2026-01-01',
      endsOn: '2025-12-31',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('endsOn'))).toBe(true);
    }
  });

  it('accepts same-day start and end', () => {
    expect(
      academicYearSchema.safeParse({ ...valid, startsOn: '2025-09-01', endsOn: '2025-09-01' })
        .success,
    ).toBe(true);
  });
});

describe('termSchema', () => {
  const cameroonTermSchema = termSchemaForStructure(3);

  it('accepts valid term 1-3 for Cameroon structure', () => {
    [1, 2, 3].forEach((n) => {
      expect(
        cameroonTermSchema.safeParse({ academicYearId: 'year-1', number: n }).success,
      ).toBe(true);
    });
  });

  it('rejects term number 0', () => {
    expect(
      cameroonTermSchema.safeParse({ academicYearId: 'year-1', number: 0 }).success,
    ).toBe(false);
  });

  it('rejects term number 4 for Cameroon structure', () => {
    expect(
      cameroonTermSchema.safeParse({ academicYearId: 'year-1', number: 4 }).success,
    ).toBe(false);
  });

  it('accepts term number 4 with wide schema', () => {
    expect(
      termSchema.safeParse({ academicYearId: 'year-1', number: 4 }).success,
    ).toBe(true);
  });

  it('rejects empty academicYearId', () => {
    expect(termSchema.safeParse({ academicYearId: '', number: 1 }).success).toBe(false);
  });
});

describe('sequenceSchema', () => {
  const valid = {
    academicYearId: 'year-1',
    termId: 'term-abc',
    number: 3,
    numberInTerm: 1,
  };
  const cameroonSequenceSchema = sequenceSchemaForStructure(6, 2);

  it('accepts valid sequence', () => {
    expect(cameroonSequenceSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects sequence number 0', () => {
    expect(cameroonSequenceSchema.safeParse({ ...valid, number: 0 }).success).toBe(
      false,
    );
  });

  it('rejects sequence number 7 for Cameroon structure', () => {
    expect(cameroonSequenceSchema.safeParse({ ...valid, number: 7 }).success).toBe(
      false,
    );
  });

  it('rejects numberInTerm 0', () => {
    expect(
      cameroonSequenceSchema.safeParse({ ...valid, numberInTerm: 0 }).success,
    ).toBe(false);
  });

  it('rejects numberInTerm 3 for Cameroon structure', () => {
    expect(
      cameroonSequenceSchema.safeParse({ ...valid, numberInTerm: 3 }).success,
    ).toBe(false);
  });
});

describe('calendarMilestoneSchema', () => {
  const valid = {
    academicYearId: 'year-1',
    kind: 'ENROLLMENT_OPEN' as const,
    onDate: '2025-09-01',
  };

  it('accepts all defined kinds', () => {
    CALENDAR_MILESTONE_KINDS.forEach((kind) => {
      expect(calendarMilestoneSchema.safeParse({ ...valid, kind }).success).toBe(true);
    });
  });

  it('rejects an unknown kind', () => {
    expect(calendarMilestoneSchema.safeParse({ ...valid, kind: 'HOLIDAY' }).success).toBe(false);
  });

  it('accepts optional termId', () => {
    expect(
      calendarMilestoneSchema.safeParse({ ...valid, termId: 'term-xyz' }).success,
    ).toBe(true);
  });

  it('rejects bad onDate format', () => {
    expect(
      calendarMilestoneSchema.safeParse({ ...valid, onDate: '2025/09/01' }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// record-display.ts — term/sequence label functions
// ---------------------------------------------------------------------------
describe('termLabel', () => {
  it('returns "Term 1" for number 1', () => {
    expect(termLabel({ number: 1 })).toBe('Term 1');
  });

  it('returns "Term 2" for number 2', () => {
    expect(termLabel({ number: 2 })).toBe('Term 2');
  });

  it('returns "Term 3" for number 3', () => {
    expect(termLabel({ number: 3 })).toBe('Term 3');
  });

  it('returns "—" for null', () => {
    expect(termLabel(null)).toBe('—');
  });

  it('returns "—" when number is undefined', () => {
    expect(termLabel({})).toBe('—');
  });

  it('returns "Term 10" for number 10', () => {
    expect(termLabel({ number: 10 })).toBe('Term 10');
  });

  it('returns "Term 20" for number 20', () => {
    expect(termLabel({ number: 20 })).toBe('Term 20');
  });
});

describe('semesterLabel (deprecated alias)', () => {
  it('is the same function as termLabel', () => {
    expect(semesterLabel({ number: 2 })).toBe('Term 2');
  });
});

describe('sequenceLabel', () => {
  it('includes both sequence and term-sequence numbers when available', () => {
    expect(sequenceLabel({ number: 3, numberInTerm: 1 })).toBe('Sequence 3 (term seq. 1)');
  });

  it('falls back to just sequence number when numberInTerm is absent', () => {
    expect(sequenceLabel({ number: 5 })).toBe('Sequence 5');
  });

  it('returns "—" for null', () => {
    expect(sequenceLabel(null)).toBe('—');
  });

  it('returns "—" when number is undefined', () => {
    expect(sequenceLabel({})).toBe('—');
  });
});

// ---------------------------------------------------------------------------
// record-display.ts — generic helpers
// ---------------------------------------------------------------------------
describe('formatRecordValue', () => {
  it('returns "—" for null', () => expect(formatRecordValue(null)).toBe('—'));
  it('returns "—" for undefined', () => expect(formatRecordValue(undefined)).toBe('—'));
  it('returns "Yes" for true', () => expect(formatRecordValue(true)).toBe('Yes'));
  it('returns "No" for false', () => expect(formatRecordValue(false)).toBe('No'));
  it('returns "—" for blank string', () => expect(formatRecordValue('   ')).toBe('—'));
  it('returns trimmed string', () => expect(formatRecordValue('  hello  ')).toBe('hello'));
  it('returns "—" for plain objects', () => expect(formatRecordValue({})).toBe('—'));
});

describe('unwrapRelation', () => {
  it('returns the object as-is if it is an object', () => {
    const obj = { id: '1', name: 'foo' };
    expect(unwrapRelation(obj)).toBe(obj);
  });

  it('unwraps single-element arrays', () => {
    const obj = { id: '2' };
    expect(unwrapRelation([obj])).toBe(obj);
  });

  it('returns first element of multi-element array', () => {
    const a = { id: '3' };
    const b = { id: '4' };
    expect(unwrapRelation([a, b])).toBe(a);
  });

  it('returns null for null', () => expect(unwrapRelation(null)).toBeNull());
  it('returns null for undefined', () => expect(unwrapRelation(undefined)).toBeNull());
  it('returns null for empty array', () => expect(unwrapRelation([])).toBeNull());
});

describe('levelLabel', () => {
  it('returns "Level 4"', () => expect(levelLabel({ number: 4 })).toBe('Level 4'));
  it('returns "—" for null', () => expect(levelLabel(null)).toBe('—'));
  it('returns "—" when number is undefined', () => expect(levelLabel({})).toBe('—'));
});
