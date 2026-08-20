import { describe, expect, it } from 'vitest';
import {
  assertAcademicYearUniqueness,
  assertSequenceBelongsToYear,
  dateRangesOverlap,
  findDuplicateMilestoneKind,
  isDateWithinYearBounds,
} from '@/lib/acadia/academic-year-guards';
import {
  formatSequenceDeleteBlockers,
  hasSequenceDeleteBlockers,
  sequenceHasMarksLock,
} from '@/lib/supabase/queries/sequence-delete';
import {
  formatTermDeleteBlockers,
  hasTermDeleteBlockers,
  termHasMarksLock,
} from '@/lib/supabase/queries/term-delete';

describe('academic year uniqueness', () => {
  const existing = [
    { id: 'y1', label: '2025-2026', startsOn: '2025-09-01', endsOn: '2026-06-30' },
  ];

  it('detects overlapping date ranges', () => {
    expect(dateRangesOverlap('2026-06-01', '2027-06-01', '2025-09-01', '2026-06-30')).toBe(
      true,
    );
    expect(dateRangesOverlap('2026-07-01', '2027-06-01', '2025-09-01', '2026-06-30')).toBe(
      false,
    );
  });

  it('rejects duplicate labels and overlaps', () => {
    expect(() =>
      assertAcademicYearUniqueness({
        label: '2025-2026',
        startsOn: '2026-09-01',
        endsOn: '2027-06-30',
        existing,
      }),
    ).toThrow(/already exists/);
    expect(() =>
      assertAcademicYearUniqueness({
        label: '2026-2027',
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        existing,
      }),
    ).toThrow(/overlap/);
  });
});

describe('calendar milestone guards', () => {
  it('requires dates inside the academic year', () => {
    expect(isDateWithinYearBounds('2026-01-15', '2025-09-01', '2026-06-30')).toBe(true);
    expect(isDateWithinYearBounds('2026-07-01', '2025-09-01', '2026-06-30')).toBe(false);
  });

  it('detects duplicate milestone kinds for the same term', () => {
    const duplicate = findDuplicateMilestoneKind({
      kind: 'ENROLLMENT_OPEN',
      termId: null,
      existing: [{ id: 'm1', kind: 'ENROLLMENT_OPEN', termId: null }],
    });
    expect(duplicate?.id).toBe('m1');
  });
});

describe('sequence membership', () => {
  it('requires the sequence year to match the term year', () => {
    expect(() =>
      assertSequenceBelongsToYear({
        sequenceAcademicYearId: 'year-a',
        termAcademicYearId: 'year-b',
      }),
    ).toThrow(/same academic year/);
  });
});

describe('term and sequence delete blockers', () => {
  it('blocks term delete when sequences or marks exist', () => {
    const blockers = {
      sequences: 2,
      examSessions: 0,
      finalizedSessions: 0,
      marks: 0,
      milestones: 0,
      subjectOfferings: 0,
      transcripts: 0,
    };
    expect(hasTermDeleteBlockers(blockers)).toBe(true);
    expect(formatTermDeleteBlockers(blockers)).toContain('2 sequence(s)');
    expect(termHasMarksLock({ ...blockers, marks: 3 })).toBe(true);
  });

  it('blocks sequence delete when exam sessions exist', () => {
    const blockers = { examSessions: 1, finalizedSessions: 1, marks: 4 };
    expect(hasSequenceDeleteBlockers(blockers)).toBe(true);
    expect(sequenceHasMarksLock(blockers)).toBe(true);
    expect(formatSequenceDeleteBlockers(blockers)).toContain('4 mark(s)');
  });
});
