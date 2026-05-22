/**
 * Wave 7I unit tests
 * Covers: class-based promotion logic, year rollover planning, retention preview
 */
import { describe, it, expect } from 'vitest';
import {
  buildPromotionCandidates,
  computeYearAverageForPromotionFromMarks,
  computeYearAveragesFromMarks,
  findNextLevel,
  meetsPromotionThreshold,
  planYearRollover,
  previewRetentionArchive,
  recommendedPromotionAction,
  requireClassPromotionPolicy,
  resolveFinalPromotionAction,
} from '@/lib/acadia/promotion';
import {
  dataRetentionPolicySchema,
  promotionFiltersSchema,
  promotionOverrideSchema,
} from '@/lib/acadia/promotion-schemas';

const levels = [
  { id: 'lvl-1', number: 1, subSystem: 'ENGLISH', branch: 'GRAMMAR' },
  { id: 'lvl-2', number: 2, subSystem: 'ENGLISH', branch: 'GRAMMAR' },
  { id: 'lvl-3', number: 3, subSystem: 'ENGLISH', branch: 'GRAMMAR' },
];

const defaultPolicy = { autoPromotionEnabled: true, minPromotionAverage: 10 };

describe('recommendedPromotionAction', () => {
  it('promotes when average meets class threshold', () => {
    expect(recommendedPromotionAction(10, defaultPolicy)).toBe('PROMOTE');
    expect(recommendedPromotionAction(12.5, defaultPolicy)).toBe('PROMOTE');
  });

  it('uses custom threshold per class', () => {
    expect(
      recommendedPromotionAction(9, { autoPromotionEnabled: true, minPromotionAverage: 9 }),
    ).toBe('PROMOTE');
    expect(
      recommendedPromotionAction(10.5, {
        autoPromotionEnabled: true,
        minPromotionAverage: 11,
      }),
    ).toBe('REPEAT');
  });

  it('returns manual-only when auto promotion is disabled', () => {
    expect(
      recommendedPromotionAction(15, {
        autoPromotionEnabled: false,
        minPromotionAverage: 10,
      }),
    ).toBe('MANUAL_ONLY');
  });

  it('repeats when average is below threshold or missing', () => {
    expect(recommendedPromotionAction(9.99, defaultPolicy)).toBe('REPEAT');
    expect(recommendedPromotionAction(null, defaultPolicy)).toBe('REPEAT');
  });
});

describe('meetsPromotionThreshold', () => {
  it('uses >= with two-decimal rounding', () => {
    expect(meetsPromotionThreshold(9.995, 10)).toBe(false);
    expect(meetsPromotionThreshold(10, 10)).toBe(true);
    expect(meetsPromotionThreshold(9.999, 9.99)).toBe(true);
  });
});

describe('findNextLevel', () => {
  it('returns the next level in the same stream', () => {
    expect(findNextLevel(levels, 'lvl-1')?.id).toBe('lvl-2');
    expect(findNextLevel(levels, 'lvl-3')).toBeNull();
  });
});

describe('resolveFinalPromotionAction', () => {
  it('graduates when passing final level', () => {
    const result = resolveFinalPromotionAction(
      'PROMOTE',
      11,
      levels,
      'lvl-3',
      10,
    );
    expect(result.finalAction).toBe('GRADUATE');
    expect(result.targetLevelId).toBeNull();
  });

  it('honours manual repeat override', () => {
    const result = resolveFinalPromotionAction(
      'PROMOTE',
      14,
      levels,
      'lvl-1',
      10,
      'REPEAT',
    );
    expect(result.finalAction).toBe('REPEAT');
    expect(result.targetLevelId).toBe('lvl-1');
  });
});

describe('buildPromotionCandidates', () => {
  it('marks manual overrides', () => {
    const rows = buildPromotionCandidates(
      [
        {
          studentProfileId: 'stu-1',
          subSystem: 'ENGLISH',
          branch: 'GRAMMAR',
          levelId: 'lvl-1',
          classId: 'cls-1',
          yearAverage: 12,
          marksComplete: true,
          policy: defaultPolicy,
          manualFinalAction: 'REPEAT',
        },
      ],
      levels,
    );
    expect(rows[0].finalAction).toBe('REPEAT');
    expect(rows[0].isManualOverride).toBe(true);
  });

  it('skips auto compute when class policy is manual-only', () => {
    const rows = buildPromotionCandidates(
      [
        {
          studentProfileId: 'stu-1',
          subSystem: 'ENGLISH',
          branch: 'GRAMMAR',
          levelId: 'lvl-1',
          classId: 'cls-1',
          yearAverage: 14,
          marksComplete: true,
          policy: { autoPromotionEnabled: false, minPromotionAverage: 10 },
        },
      ],
      levels,
    );
    expect(rows[0].skippedAuto).toBe(true);
  });

  it('skips auto when marks are incomplete', () => {
    const rows = buildPromotionCandidates(
      [
        {
          studentProfileId: 'stu-1',
          subSystem: 'ENGLISH',
          branch: 'GRAMMAR',
          levelId: 'lvl-1',
          classId: 'cls-1',
          yearAverage: null,
          marksComplete: false,
          policy: defaultPolicy,
        },
      ],
      levels,
    );
    expect(rows[0].skippedPendingMarks).toBe(true);
    expect(rows[0].skippedAuto).toBe(true);
  });
});

describe('computeYearAverageForPromotionFromMarks', () => {
  it('returns incomplete when class subjects lack marks', () => {
    const result = computeYearAverageForPromotionFromMarks(
      [
        {
          studentProfileId: 'stu-1',
          subjectId: 'sub-1',
          totalScore: 10,
          sequenceNumber: 1,
        },
      ],
      'stu-1',
      ['sub-1', 'sub-2'],
    );
    expect(result.status).toBe('incomplete');
  });
});

describe('computeYearAveragesFromMarks', () => {
  it('averages marks across sequences for a student', () => {
    const averages = computeYearAveragesFromMarks([
      { studentProfileId: 'stu-1', totalScore: 12, sequenceNumber: 1 },
      { studentProfileId: 'stu-1', totalScore: 8, sequenceNumber: 2 },
    ]);
    expect(averages.get('stu-1')).toBe(10);
  });
});

describe('planYearRollover', () => {
  it('creates enrollment plans for promote and repeat', () => {
    const plan = planYearRollover({
      sourceAcademicYearId: 'year-1',
      targetAcademicYearId: 'year-2',
      candidates: [
        {
          studentProfileId: 'stu-1',
          subSystem: 'ENGLISH',
          branch: 'GRAMMAR',
          classId: 'cls-1',
          fromLevelId: 'lvl-1',
          yearAverage: 12,
          policyMinAverage: 10,
          recommendedAction: 'PROMOTE',
          finalAction: 'PROMOTE',
          targetLevelId: 'lvl-2',
          targetClassId: null,
          isManualOverride: false,
          skippedAuto: false,
          skippedPendingMarks: false,
        },
        {
          studentProfileId: 'stu-2',
          subSystem: 'ENGLISH',
          branch: 'GRAMMAR',
          classId: 'cls-1',
          fromLevelId: 'lvl-1',
          yearAverage: 8,
          policyMinAverage: 10,
          recommendedAction: 'REPEAT',
          finalAction: 'REPEAT',
          targetLevelId: 'lvl-1',
          targetClassId: 'cls-1',
          isManualOverride: false,
          skippedAuto: false,
          skippedPendingMarks: false,
        },
      ],
      promoteEligible: true,
      repeatNonEligible: true,
    });
    expect(plan.promoted).toBe(1);
    expect(plan.repeated).toBe(1);
    expect(plan.enrollments).toHaveLength(2);
  });
});

describe('previewRetentionArchive', () => {
  it('describes archival impact', () => {
    const preview = previewRetentionArchive({
      referenceDate: new Date('2026-05-19'),
      archiveInactiveAfterYears: 3,
      enrollmentRetentionYears: 10,
      inactiveProfileCount: 2,
      oldEnrollmentCount: 5,
    });
    expect(preview.inactiveProfiles).toBe(2);
    expect(preview.oldEnrollments).toBe(5);
    expect(preview.description).toContain('5 enrollment');
  });
});

describe('promotion schemas', () => {
  it('validates class-based promotion filters', () => {
    expect(
      promotionFiltersSchema.safeParse({
        academicYearId: 'year-1',
        bulkMode: 'class',
        classId: 'cls-1',
      }).success,
    ).toBe(true);
  });

  it('validates stream bulk mode', () => {
    expect(
      promotionFiltersSchema.safeParse({
        academicYearId: 'year-1',
        bulkMode: 'stream',
        subSystem: 'ENGLISH',
        branch: 'GRAMMAR',
      }).success,
    ).toBe(true);
  });

  it('validates override schema with target level for promote', () => {
    expect(
      promotionOverrideSchema.safeParse({
        studentProfileId: 'stu-1',
        academicYearId: 'year-1',
        finalAction: 'PROMOTE',
        targetLevelId: 'lvl-2',
        notes: 'Board exception',
      }).success,
    ).toBe(true);
  });

  it('validates retention policy', () => {
    expect(
      dataRetentionPolicySchema.safeParse({
        marksRetentionYears: 7,
        enrollmentRetentionYears: 10,
        archiveInactiveAfterYears: 3,
      }).success,
    ).toBe(true);
  });
});

describe('requireClassPromotionPolicy', () => {
  it('throws when policy is missing', () => {
    expect(() => requireClassPromotionPolicy(null, 'Form 1')).toThrow(
      /Configure a promotion policy/,
    );
  });
});
