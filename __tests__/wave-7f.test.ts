/**
 * Wave 7F unit tests
 * Covers: assessment schemas, scoring, exam types, rankings
 */
import { describe, it, expect } from 'vitest';
import {
  EXAM_SESSION_TYPES,
  averageScores,
  buildSubjectMarkRow,
  buildExamSessionRow,
  canEditExamSession,
  collapseMarksToSubjectScore,
  computeStudentSubjectAverages,
  computeTotalScore,
  examSessionTypeLabel,
  isMajorExamType,
  isPassingScore,
  rankStudents,
  weightedAverage,
} from '@/lib/acadia/assessment';
import {
  subjectMarkEntrySchema,
  examSessionSchema,
} from '@/lib/acadia/assessment-schemas';

describe('examSessionSchema', () => {
  it('requires academic placement and valid date range', () => {
    expect(
      examSessionSchema.safeParse({
        academicYearId: 'year-1',
        subjectId: 'subject-1',
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
        subjectId: 'subject-1',
        termId: 'term-1',
        type: 'GCE',
        startsOn: '2026-06-15',
        endsOn: '2026-06-01',
      }).success,
    ).toBe(false);
  });
});

describe('subjectMarkEntrySchema', () => {
  it('accepts scores on /20 scale', () => {
    expect(
      subjectMarkEntrySchema.safeParse({
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
        subjectId: 'subject-1',
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

  it('builds subject mark with computed total', () => {
    const row = buildSubjectMarkRow(
      'tenant-1',
      'mark-1',
      {
        examSessionId: 'exam-1',
        studentProfileId: 'student-1',
        subjectId: 'subject-1',
        values: { studentProfileId: 'student-1', caScore: 10, examScore: 14 },
        enteredByUserId: 'user-1',
      },
      '2026-05-19T00:00:00.000Z',
    );
    expect(row.totalScore).toBe(12);
    expect(row.subjectSubBranchId).toBeNull();
  });
});

describe('passing threshold', () => {
  it('uses Cameroon 10/20 pass rule', () => {
    expect(isPassingScore(10)).toBe(true);
    expect(isPassingScore(9.99)).toBe(false);
    expect(averageScores([8, 12])).toBe(10);
  });
});

describe('weighted averages', () => {
  it('weights scores by coefficient', () => {
    expect(
      weightedAverage([
        { score: 10, coefficient: 3 },
        { score: 16, coefficient: 5 },
      ]),
    ).toBe(13.75);
  });

  it('collapses sub-branch marks with inherited and custom coefficients', () => {
    expect(
      collapseMarksToSubjectScore([
        {
          totalScore: 12,
          subjectSubBranchId: 'organic',
          subjectCoefficient: 5,
          subBranchCoefficient: null,
        },
        {
          totalScore: 16,
          subjectSubBranchId: 'inorganic',
          subjectCoefficient: 5,
          subBranchCoefficient: 2,
        },
      ]),
    ).toBe(13.14);
  });

  it('returns null when a paper in the group is unscored', () => {
    expect(
      collapseMarksToSubjectScore([
        {
          totalScore: 12,
          subjectSubBranchId: 'organic',
          subjectCoefficient: 5,
        },
        {
          totalScore: null,
          subjectSubBranchId: 'inorganic',
          subjectCoefficient: 5,
        },
      ]),
    ).toBeNull();
  });

  it('returns null when a required paper is absent', () => {
    expect(
      collapseMarksToSubjectScore(
        [
          {
            totalScore: 12,
            subjectSubBranchId: 'organic',
            subjectCoefficient: 5,
          },
        ],
        ['organic', 'inorganic'],
      ),
    ).toBeNull();
  });

  it('computes a student average from subject coefficients', () => {
    const averages = computeStudentSubjectAverages([
      {
        studentProfileId: 'stu-1',
        subjectId: 'chem',
        totalScore: 10,
        subjectCoefficient: 3,
      },
      {
        studentProfileId: 'stu-1',
        subjectId: 'math',
        totalScore: 16,
        subjectCoefficient: 5,
      },
    ]);
    expect(averages.get('stu-1')).toBe(13.75);
  });

  it('collapses sub-branches per sequence before averaging periods', () => {
    const averages = computeStudentSubjectAverages([
      {
        studentProfileId: 'stu-1',
        subjectId: 'chem',
        sequenceId: 'seq-1',
        totalScore: 18,
        subjectCoefficient: 5,
      },
      {
        studentProfileId: 'stu-1',
        subjectId: 'chem',
        sequenceId: 'seq-2',
        subjectSubBranchId: 'organic',
        totalScore: 10,
        subjectCoefficient: 5,
        subBranchCoefficient: 5,
      },
      {
        studentProfileId: 'stu-1',
        subjectId: 'chem',
        sequenceId: 'seq-2',
        subjectSubBranchId: 'inorganic',
        totalScore: 10,
        subjectCoefficient: 5,
        subBranchCoefficient: 2,
      },
    ]);
    expect(averages.get('stu-1')).toBe(14);
  });

  it('weights subjects within each sequence then averages those scores', () => {
    const averages = computeStudentSubjectAverages([
      {
        studentProfileId: 'stu-1',
        subjectId: 'chem',
        sequenceId: 'seq-1',
        totalScore: 10,
        subjectCoefficient: 3,
      },
      {
        studentProfileId: 'stu-1',
        subjectId: 'math',
        sequenceId: 'seq-1',
        totalScore: 16,
        subjectCoefficient: 5,
      },
      {
        studentProfileId: 'stu-1',
        subjectId: 'chem',
        sequenceId: 'seq-2',
        totalScore: 20,
        subjectCoefficient: 3,
      },
    ]);
    expect(averages.get('stu-1')).toBe(16.88);
  });
});
