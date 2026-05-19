/**
 * Wave 7F unit tests
 * Covers: assessment schemas, scoring, exam types, rankings
 */
import { describe, it, expect } from 'vitest';
import {
  EXAM_SESSION_TYPES,
  averageScores,
  buildCourseMarkRow,
  buildExamSessionRow,
  canEditExamSession,
  computeTotalScore,
  examSessionTypeLabel,
  isMajorExamType,
  isPassingScore,
  rankStudents,
} from '@/lib/acadia/assessment';
import {
  courseMarkEntrySchema,
  examSessionSchema,
} from '@/lib/acadia/assessment-schemas';

describe('examSessionSchema', () => {
  it('requires academic placement and valid date range', () => {
    expect(
      examSessionSchema.safeParse({
        academicYearId: 'year-1',
        courseId: 'course-1',
        termId: 'term-1',
        sequenceId: 'seq-1',
        type: 'NORMAL',
        startsOn: '2026-06-01',
        endsOn: '2026-06-15',
      }).success,
    ).toBe(true);
  });

  it('rejects end date before start date', () => {
    expect(
      examSessionSchema.safeParse({
        academicYearId: 'year-1',
        courseId: 'course-1',
        termId: 'term-1',
        type: 'GCE',
        startsOn: '2026-06-15',
        endsOn: '2026-06-01',
      }).success,
    ).toBe(false);
  });
});

describe('courseMarkEntrySchema', () => {
  it('accepts scores on /20 scale', () => {
    expect(
      courseMarkEntrySchema.safeParse({
        studentProfileId: 'student-1',
        caScore: 14,
        examScore: 12,
      }).success,
    ).toBe(true);
  });
});

describe('computeTotalScore', () => {
  it('averages CA and exam when both present', () => {
    expect(computeTotalScore(12, 16)).toBe(14);
  });

  it('uses single score when only one component', () => {
    expect(computeTotalScore(15, null)).toBe(15);
  });
});

describe('rankStudents', () => {
  it('assigns competition ranks with ties', () => {
    const ranked = rankStudents([
      { studentProfileId: 'a', average: 15 },
      { studentProfileId: 'b', average: 12 },
      { studentProfileId: 'c', average: 12 },
    ]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(2);
  });
});

describe('exam session helpers', () => {
  it('includes major Cameroon exam types', () => {
    expect(EXAM_SESSION_TYPES).toContain('GCE');
    expect(EXAM_SESSION_TYPES).toContain('BEPC');
    expect(EXAM_SESSION_TYPES).toContain('PROBATOIRE');
    expect(EXAM_SESSION_TYPES).toContain('BACCALAUREAT');
    expect(isMajorExamType('GCE')).toBe(true);
    expect(isMajorExamType('NORMAL')).toBe(false);
  });

  it('labels exam types for display', () => {
    expect(examSessionTypeLabel('BACCALAUREAT')).toBe('Baccalauréat');
  });

  it('blocks edits when finalized', () => {
    expect(canEditExamSession(null)).toBe(true);
    expect(canEditExamSession('2026-01-01')).toBe(false);
  });
});

describe('build rows', () => {
  it('builds exam session row with optional sequence', () => {
    const row = buildExamSessionRow(
      'tenant-1',
      'exam-1',
      {
        academicYearId: 'year-1',
        courseId: 'course-1',
        termId: 'term-1',
        sequenceId: '',
        type: 'NORMAL',
        startsOn: '2026-06-01',
        endsOn: '2026-06-10',
      },
      '2026-05-19T00:00:00.000Z',
    );
    expect(row.sequenceId).toBeNull();
    expect(row.type).toBe('NORMAL');
  });

  it('builds course mark with computed total', () => {
    const row = buildCourseMarkRow(
      'tenant-1',
      'mark-1',
      {
        examSessionId: 'exam-1',
        studentProfileId: 'student-1',
        courseId: 'course-1',
        values: { studentProfileId: 'student-1', caScore: 10, examScore: 14 },
        enteredByUserId: 'user-1',
      },
      '2026-05-19T00:00:00.000Z',
    );
    expect(row.totalScore).toBe(12);
  });
});

describe('passing threshold', () => {
  it('uses Cameroon 10/20 pass rule', () => {
    expect(isPassingScore(10)).toBe(true);
    expect(isPassingScore(9.99)).toBe(false);
    expect(averageScores([8, 12])).toBe(10);
  });
});
