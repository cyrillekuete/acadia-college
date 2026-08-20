import { describe, expect, it } from 'vitest';
import { examSessionSchema } from '@/lib/acadia/assessment-schemas';
import {
  EMPTY_EXAM_SESSION_LIST_FILTERS,
  examSessionRowMatchesFilters,
} from '@/lib/acadia/exam-session-list';
import {
  assertExamSessionDates,
  assertExamSessionPlacement,
  assertExamSessionUnique,
  assertExamSessionUpdateAllowed,
  buildExamSessionDeleteBlockedMessage,
  examScheduleStatus,
  examSessionDuplicateKey,
  examSessionIdentityChanged,
  findDuplicateExamSession,
  formatExamSessionDeleteBlockers,
  hasExamSessionDeleteBlockers,
  requiresSequence,
} from '@/lib/acadia/exam-session-guards';

const baseCandidate = {
  id: 'exam-new',
  type: 'NORMAL',
  academicYearId: 'year-1',
  subjectId: 'math',
  sequenceId: 'seq-1',
};

describe('requiresSequence', () => {
  it('requires a sequence for NORMAL and RESIT only', () => {
    expect(requiresSequence('NORMAL')).toBe(true);
    expect(requiresSequence('RESIT')).toBe(true);
    expect(requiresSequence('GCE')).toBe(false);
    expect(requiresSequence('BEPC')).toBe(false);
  });
});

describe('examSessionSchema sequence rules', () => {
  const validDates = { startsOn: '2026-06-01', endsOn: '2026-06-15' };

  it('requires sequence for NORMAL exams', () => {
    const result = examSessionSchema.safeParse({
      academicYearId: 'year-1',
      subjectId: 'subject-1',
      termId: 'term-1',
      sequenceId: '',
      type: 'NORMAL',
      ...validDates,
    });
    expect(result.success).toBe(false);
  });

  it('allows major exams without a sequence', () => {
    const result = examSessionSchema.safeParse({
      academicYearId: 'year-1',
      subjectId: 'subject-1',
      termId: 'term-1',
      type: 'GCE',
      ...validDates,
    });
    expect(result.success).toBe(true);
  });
});

describe('exam session uniqueness', () => {
  const existing = [
    {
      id: 'exam-1',
      type: 'NORMAL',
      academicYearId: 'year-1',
      subjectId: 'math',
      sequenceId: 'seq-1',
    },
    {
      id: 'exam-gce',
      type: 'GCE',
      academicYearId: 'year-1',
      subjectId: 'math',
      sequenceId: null,
    },
  ];

  it('keys NORMAL sessions by year, subject, and sequence', () => {
    expect(examSessionDuplicateKey(baseCandidate)).toBe(
      'NORMAL::year-1::math::seq-1',
    );
  });

  it('keys major exams without sequence', () => {
    expect(
      examSessionDuplicateKey({
        type: 'GCE',
        academicYearId: 'year-1',
        subjectId: 'math',
        sequenceId: 'ignored',
      }),
    ).toBe('GCE::year-1::math');
  });

  it('detects a duplicate NORMAL session', () => {
    expect(findDuplicateExamSession(baseCandidate, existing)?.id).toBe('exam-1');
    expect(() =>
      assertExamSessionUnique({ candidate: baseCandidate, existing }),
    ).toThrow(/already exists/);
  });

  it('detects a duplicate major exam for the same subject', () => {
    expect(
      findDuplicateExamSession(
        {
          id: 'exam-new',
          type: 'GCE',
          academicYearId: 'year-1',
          subjectId: 'math',
          sequenceId: '',
        },
        existing,
      )?.id,
    ).toBe('exam-gce');
  });

  it('ignores the row being edited', () => {
    expect(
      findDuplicateExamSession(existing[0], existing, 'exam-1'),
    ).toBeNull();
  });
});

describe('exam session placement', () => {
  it('rejects a term from another year', () => {
    expect(() =>
      assertExamSessionPlacement({
        academicYearId: 'year-1',
        termId: 'term-2',
        termAcademicYearId: 'year-2',
        type: 'GCE',
      }),
    ).toThrow(/academic year/);
  });

  it('rejects a sequence that belongs to another term', () => {
    expect(() =>
      assertExamSessionPlacement({
        academicYearId: 'year-1',
        termId: 'term-1',
        termAcademicYearId: 'year-1',
        type: 'NORMAL',
        sequenceId: 'seq-2',
        sequenceTermId: 'term-2',
        sequenceAcademicYearId: 'year-1',
      }),
    ).toThrow(/selected term/);
  });

  it('rejects a sequence from another year', () => {
    expect(() =>
      assertExamSessionPlacement({
        academicYearId: 'year-1',
        termId: 'term-1',
        termAcademicYearId: 'year-1',
        type: 'NORMAL',
        sequenceId: 'seq-1',
        sequenceTermId: 'term-1',
        sequenceAcademicYearId: 'year-2',
      }),
    ).toThrow(/same academic year/);
  });

  it('requires a sequence for NORMAL exams', () => {
    expect(() =>
      assertExamSessionPlacement({
        academicYearId: 'year-1',
        termId: 'term-1',
        termAcademicYearId: 'year-1',
        type: 'NORMAL',
      }),
    ).toThrow(/Sequence is required/);
  });
});

describe('exam session dates', () => {
  it('rejects an end date before the start date', () => {
    expect(() =>
      assertExamSessionDates({ startsOn: '2026-06-15', endsOn: '2026-06-01' }),
    ).toThrow(/on or after/);
  });

  it('rejects dates outside the academic year', () => {
    expect(() =>
      assertExamSessionDates({
        startsOn: '2026-07-01',
        endsOn: '2026-07-10',
        yearStartsOn: '2025-09-01',
        yearEndsOn: '2026-06-30',
      }),
    ).toThrow(/academic year/);
  });

  it('rejects dates outside the exam period when configured', () => {
    expect(() =>
      assertExamSessionDates({
        startsOn: '2026-05-01',
        endsOn: '2026-05-10',
        yearStartsOn: '2025-09-01',
        yearEndsOn: '2026-06-30',
        examPeriodOpensOn: '2026-06-01',
        examPeriodClosesOn: '2026-06-20',
      }),
    ).toThrow(/exam period/);
  });

  it('allows dates when no exam period is configured', () => {
    expect(() =>
      assertExamSessionDates({
        startsOn: '2026-01-15',
        endsOn: '2026-01-20',
        yearStartsOn: '2025-09-01',
        yearEndsOn: '2026-06-30',
      }),
    ).not.toThrow();
  });
});

describe('exam session update locks', () => {
  const identity = {
    subjectId: 'math',
    termId: 'term-1',
    sequenceId: 'seq-1',
    type: 'NORMAL',
  };

  it('blocks any edit when finalized', () => {
    expect(() =>
      assertExamSessionUpdateAllowed({
        finalizedAt: '2026-06-20T00:00:00.000Z',
        markCount: 0,
        current: identity,
        next: identity,
      }),
    ).toThrow(/finalized/);
  });

  it('locks identity fields after marks exist', () => {
    expect(
      examSessionIdentityChanged(identity, { ...identity, subjectId: 'eng' }),
    ).toBe(true);
    expect(() =>
      assertExamSessionUpdateAllowed({
        finalizedAt: null,
        markCount: 3,
        current: identity,
        next: { ...identity, subjectId: 'eng' },
      }),
    ).toThrow(/marks have been entered/);
  });

  it('allows date-only changes when marks exist', () => {
    expect(() =>
      assertExamSessionUpdateAllowed({
        finalizedAt: null,
        markCount: 3,
        current: identity,
        next: identity,
      }),
    ).not.toThrow();
  });
});

describe('exam session delete blockers', () => {
  it('blocks delete when finalized or marks exist', () => {
    expect(hasExamSessionDeleteBlockers({ marks: 0, finalized: true })).toBe(
      true,
    );
    expect(hasExamSessionDeleteBlockers({ marks: 2, finalized: false })).toBe(
      true,
    );
    expect(hasExamSessionDeleteBlockers({ marks: 0, finalized: false })).toBe(
      false,
    );
    expect(
      formatExamSessionDeleteBlockers({ marks: 4, finalized: true }),
    ).toEqual(['the session is finalized', '4 mark(s)']);
    expect(
      buildExamSessionDeleteBlockedMessage({ marks: 1, finalized: false }),
    ).toContain('1 mark(s)');
  });
});

describe('exam schedule status', () => {
  it('classifies upcoming, in progress, and past sessions', () => {
    expect(examScheduleStatus('2026-06-10', '2026-06-12', '2026-06-01')).toBe(
      'upcoming',
    );
    expect(examScheduleStatus('2026-06-01', '2026-06-12', '2026-06-05')).toBe(
      'inProgress',
    );
    expect(examScheduleStatus('2026-05-01', '2026-05-10', '2026-06-01')).toBe(
      'past',
    );
  });
});

describe('exam session list filters', () => {
  const row = {
    id: 'exam-1',
    type: 'NORMAL',
    termId: 'term-1',
    finalizedAt: null,
  };

  it('matches by type, term, and finalized status', () => {
    expect(
      examSessionRowMatchesFilters(row, EMPTY_EXAM_SESSION_LIST_FILTERS),
    ).toBe(true);
    expect(
      examSessionRowMatchesFilters(row, {
        ...EMPTY_EXAM_SESSION_LIST_FILTERS,
        type: 'GCE',
      }),
    ).toBe(false);
    expect(
      examSessionRowMatchesFilters(row, {
        ...EMPTY_EXAM_SESSION_LIST_FILTERS,
        status: 'finalized',
      }),
    ).toBe(false);
    expect(
      examSessionRowMatchesFilters(
        { ...row, finalizedAt: '2026-06-20' },
        { ...EMPTY_EXAM_SESSION_LIST_FILTERS, status: 'finalized' },
      ),
    ).toBe(true);
  });
});
