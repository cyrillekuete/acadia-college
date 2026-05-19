/**
 * Wave 7I unit tests
 * Covers: promotion logic, year rollover planning, retention preview
 */
import { describe, it, expect } from 'vitest';
import {
  buildPromotionCandidates,
  computeYearAveragesFromMarks,
  findNextLevel,
  planYearRollover,
  previewRetentionArchive,
  recommendedPromotionAction,
  resolveFinalPromotionAction,
} from '@/lib/acadia/promotion';
import {
  dataRetentionPolicySchema,
  promotionFiltersSchema,
  promotionOverrideSchema,
} from '@/lib/acadia/promotion-schemas';

const levels = [
  { id: 'lvl-1', specialtyId: 'spec-a', number: 1 },
  { id: 'lvl-2', specialtyId: 'spec-a', number: 2 },
  { id: 'lvl-3', specialtyId: 'spec-a', number: 3 },
];

describe('recommendedPromotionAction', () => {
  it('promotes when average is at least 10', () => {
    expect(recommendedPromotionAction(10)).toBe('PROMOTE');
    expect(recommendedPromotionAction(12.5)).toBe('PROMOTE');
  });

  it('repeats when average is below 10 or missing', () => {
    expect(recommendedPromotionAction(9.99)).toBe('REPEAT');
    expect(recommendedPromotionAction(null)).toBe('REPEAT');
  });
});

describe('findNextLevel', () => {
  it('returns the next level in the same specialty', () => {
    expect(findNextLevel(levels, 'spec-a', 'lvl-1')?.id).toBe('lvl-2');
    expect(findNextLevel(levels, 'spec-a', 'lvl-3')).toBeNull();
  });
});

describe('resolveFinalPromotionAction', () => {
  it('graduates when passing final level', () => {
    const result = resolveFinalPromotionAction(
      'PROMOTE',
      11,
      levels,
      'spec-a',
      'lvl-3',
    );
    expect(result.finalAction).toBe('GRADUATE');
    expect(result.targetLevelId).toBeNull();
  });

  it('honours manual repeat override', () => {
    const result = resolveFinalPromotionAction(
      'PROMOTE',
      14,
      levels,
      'spec-a',
      'lvl-1',
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
          specialtyId: 'spec-a',
          levelId: 'lvl-1',
          yearAverage: 12,
          manualFinalAction: 'REPEAT',
        },
      ],
      levels,
    );
    expect(rows[0].finalAction).toBe('REPEAT');
    expect(rows[0].isManualOverride).toBe(true);
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
          specialtyId: 'spec-a',
          fromLevelId: 'lvl-1',
          yearAverage: 12,
          recommendedAction: 'PROMOTE',
          finalAction: 'PROMOTE',
          targetLevelId: 'lvl-2',
          isManualOverride: false,
        },
        {
          studentProfileId: 'stu-2',
          specialtyId: 'spec-a',
          fromLevelId: 'lvl-1',
          yearAverage: 8,
          recommendedAction: 'REPEAT',
          finalAction: 'REPEAT',
          targetLevelId: 'lvl-1',
          isManualOverride: false,
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
  it('validates promotion filters', () => {
    expect(
      promotionFiltersSchema.safeParse({
        academicYearId: 'year-1',
        specialtyId: 'spec-1',
        levelId: 'lvl-1',
      }).success,
    ).toBe(true);
  });

  it('validates override schema', () => {
    expect(
      promotionOverrideSchema.safeParse({
        studentProfileId: 'stu-1',
        academicYearId: 'year-1',
        finalAction: 'DEFER',
        notes: 'Medical leave',
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
