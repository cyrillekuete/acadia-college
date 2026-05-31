import { describe, expect, it } from 'vitest';
import {
  countPendingMarksFromScope,
  sumOutstandingFeeBalances,
} from '@/lib/supabase/queries/role-dashboard';

describe('countPendingMarksFromScope', () => {
  const scope = {
    classIds: ['class-a'],
    subjectIds: ['math'],
    pairs: [
      {
        classId: 'class-a',
        subjectId: 'math',
        className: 'Form 1A',
        subjectName: 'Mathematics',
      },
    ],
  };

  it('counts missing mark entries for scoped students and exam sessions', () => {
    const pending = countPendingMarksFromScope({
      scope,
      examSessions: [{ id: 'exam-1', subjectId: 'math' }],
      marks: [{ examSessionId: 'exam-1', subjectId: 'math', studentProfileId: 'student-1' }],
      enrollments: [
        { studentProfileId: 'student-1', classId: 'class-a' },
        { studentProfileId: 'student-2', classId: 'class-a' },
      ],
    });

    expect(pending).toBe(1);
  });

  it('returns zero when teacher has no scoped classes', () => {
    const pending = countPendingMarksFromScope({
      scope: { classIds: [], subjectIds: ['math'], pairs: [] },
      examSessions: [{ id: 'exam-1', subjectId: 'math' }],
      marks: [],
      enrollments: [{ studentProfileId: 'student-1', classId: 'class-a' }],
    });

    expect(pending).toBe(0);
  });

  it('ignores exam sessions for subjects outside the teacher scope', () => {
    const pending = countPendingMarksFromScope({
      scope,
      examSessions: [{ id: 'exam-1', subjectId: 'english' }],
      marks: [],
      enrollments: [{ studentProfileId: 'student-1', classId: 'class-a' }],
    });

    expect(pending).toBe(0);
  });
});

describe('sumOutstandingFeeBalances', () => {
  it('sums balance across multiple fee accounts', () => {
    const total = sumOutstandingFeeBalances([
      {
        totalAmountMinor: 100_000,
        installments: [
          { amountMinor: 50_000, status: 'PAID', paidAmountMinor: 50_000 },
          { amountMinor: 50_000, status: 'PENDING', paidAmountMinor: null },
        ],
      },
      {
        totalAmountMinor: 80_000,
        installments: [
          { amountMinor: 80_000, status: 'PENDING', paidAmountMinor: 20_000 },
        ],
      },
    ]);

    expect(total).toBe(110_000);
  });

  it('returns zero for empty accounts', () => {
    expect(sumOutstandingFeeBalances([])).toBe(0);
  });
});
