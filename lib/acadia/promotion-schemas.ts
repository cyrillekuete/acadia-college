import { z } from 'zod';

export const PROMOTION_ACTIONS = [
  'PROMOTE',
  'REPEAT',
  'GRADUATE',
  'WITHDRAW',
  'DEFER',
] as const;

export type PromotionAction = (typeof PROMOTION_ACTIONS)[number];

export const promotionFiltersSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required.'),
  specialtyId: z.string().min(1, 'Specialty is required.'),
  levelId: z.string().min(1, 'Level is required.'),
});

export type PromotionFiltersValues = z.infer<typeof promotionFiltersSchema>;

export const promotionOverrideSchema = z.object({
  studentProfileId: z.string().min(1),
  academicYearId: z.string().min(1),
  finalAction: z.enum(PROMOTION_ACTIONS),
  targetLevelId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type PromotionOverrideValues = z.infer<typeof promotionOverrideSchema>;

export const yearRolloverSchema = z
  .object({
    sourceAcademicYearId: z.string().min(1, 'Source year is required.'),
    targetAcademicYearId: z.string().optional(),
    createTargetYear: z.boolean().optional(),
    targetYearLabel: z.string().optional(),
    targetYearStartsOn: z.string().optional(),
    targetYearEndsOn: z.string().optional(),
    promoteEligible: z.boolean(),
    repeatNonEligible: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.createTargetYear) {
      if (!data.targetYearLabel?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'New year label is required.',
          path: ['targetYearLabel'],
        });
      }
      if (!data.targetYearStartsOn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start date is required.',
          path: ['targetYearStartsOn'],
        });
      }
      if (!data.targetYearEndsOn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date is required.',
          path: ['targetYearEndsOn'],
        });
      }
    } else if (!data.targetAcademicYearId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Target year is required.',
        path: ['targetAcademicYearId'],
      });
    }
  });

export type YearRolloverValues = z.infer<typeof yearRolloverSchema>;

export const dataRetentionPolicySchema = z.object({
  marksRetentionYears: z.coerce.number().int().min(1).max(30),
  enrollmentRetentionYears: z.coerce.number().int().min(1).max(30),
  archiveInactiveAfterYears: z.coerce.number().int().min(1).max(15),
});

export type DataRetentionPolicyValues = z.infer<typeof dataRetentionPolicySchema>;
