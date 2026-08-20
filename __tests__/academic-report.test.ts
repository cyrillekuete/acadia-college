import { describe, expect, it } from 'vitest';
import { buildAcademicReportRankings } from '@/lib/acadia/academic-report';
import type { SubjectMarkSnapshot } from '@/lib/acadia/assessment';
import {
  assertExamSessionEditableForMarks,
  assertMarkEntryCalendarAllowed,
  assertMarkNotStale,
  parseMarksEntryContext,
} from '@/lib/acadia/marks-entry-guards';

function snapshot(
  partial: Partial<SubjectMarkSnapshot> &
    Pick<SubjectMarkSnapshot, 'studentProfileId' | 'subjectId' | 'totalScore'>,
): SubjectMarkSnapshot {
  return {
    sequenceId: 'seq-1',
    termId: 'term-1',
    subjectCoefficient: 1,
    ...partial,
  };
}

describe('buildAcademicReportRankings', () => {
  it('ranks only enrolled students matching the cohort', () => {
    const snapshots = [
      snapshot({ studentProfileId: 'enrolled', subjectId: 'math', totalScore: 14 }),
      snapshot({ studentProfileId: 'withdrawn', subjectId: 'math', totalScore: 19 }),
      snapshot({ studentProfileId: 'other-level', subjectId: 'math', totalScore: 18 }),
    ];

    const rows = buildAcademicReportRankings({
      snapshots,
      enrolledStudentIds: new Set(['enrolled']),
      enrollmentByStudent: new Map([
        [
          'enrolled',
          {
            registrationNumber: 'REG-1',
            User: { name: 'Ada Lovelace' },
          },
        ],
      ]),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.studentProfileId).toBe('enrolled');
    expect(rows[0]?.name).toBe('Ada Lovelace');
    expect(rows[0]?.rank).toBe(1);
  });

  it('excludes students with marks but no enrollment profile', () => {
    const rows = buildAcademicReportRankings({
      snapshots: [
        snapshot({ studentProfileId: 'ghost', subjectId: 'math', totalScore: 20 }),
      ],
      enrolledStudentIds: new Set(),
      enrollmentByStudent: new Map(),
    });
    expect(rows).toEqual([]);
  });
});

describe('marks entry guards', () => {
  it('blocks saves when the exam session is finalized', () => {
    expect(() =>
      assertExamSessionEditableForMarks({ finalizedAt: '2026-08-01T00:00:00.000Z' }),
    ).toThrow(/finalized/i);
    expect(() =>
      assertExamSessionEditableForMarks({ finalizedAt: null }),
    ).not.toThrow();
  });

  it('enforces calendar + session dates when policy requires both', () => {
    expect(() =>
      assertMarkEntryCalendarAllowed({
        milestones: [
          { kind: 'MARK_ENTRY_OPEN', onDate: '2026-01-01' },
          { kind: 'MARK_ENTRY_CLOSE', onDate: '2026-12-31' },
        ],
        policy: 'CALENDAR_AND_SESSION',
        session: { startsOn: '2026-03-01', endsOn: '2026-03-15' },
        bypass: false,
        today: '2026-03-20',
      }),
    ).toThrow(/closed for this exam session/i);

    expect(() =>
      assertMarkEntryCalendarAllowed({
        milestones: [
          { kind: 'MARK_ENTRY_OPEN', onDate: '2026-01-01' },
          { kind: 'MARK_ENTRY_CLOSE', onDate: '2026-12-31' },
        ],
        policy: 'SESSION_DATES_ONLY',
        session: { startsOn: '2026-03-01', endsOn: '2026-03-15' },
        bypass: false,
        today: '2026-03-20',
      }),
    ).not.toThrow();
  });

  it('detects stale mark updates', () => {
    expect(() =>
      assertMarkNotStale({
        existingUpdatedAt: '2026-08-01T10:00:00.000Z',
        expectedUpdatedAt: '2026-08-01T09:00:00.000Z',
      }),
    ).toThrow(/Reload and try again/i);
  });

  it('rejects out-of-range scores via Zod', () => {
    expect(() =>
      parseMarksEntryContext({
        academicYearId: 'year',
        sequenceId: 'seq',
        subjectId: 'sub',
        examSessionId: 'exam',
        marks: [
          {
            studentProfileId: 'stu',
            caScore: 25,
            examScore: 10,
          },
        ],
      }),
    ).toThrow();
  });
});
