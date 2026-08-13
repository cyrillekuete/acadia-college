import { z } from 'zod';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
} from '@/lib/acadia/education-system';

export const PROMOTION_ACTIONS = [
  'PROMOTE',
  'REPEAT',
  'GRADUATE',
  'WITHDRAW',
  'DEFER',
] as const;

export type PromotionAction = (typeof PROMOTION_ACTIONS)[number];

export const PROMOTION_BULK_MODES = ['class', 'stream', 'year'] as const;
export type PromotionBulkMode = (typeof PROMOTION_BULK_MODES)[number];

export const promotionFiltersSchema = z
  .object({
    academicYearId: z.string().min(1, 'validation.required.academicYear'),
    bulkMode: z.enum(PROMOTION_BULK_MODES),
    classId: z.string().optional(),
    subSystem: z.enum(ACADEMIC_SUB_SYSTEMS).optional(),
    branch: z.enum(ACADEMIC_BRANCHES).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.bulkMode === 'class' && !data.classId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.required.class',
        path: ['classId'],
      });
    }
    if (data.bulkMode === 'stream' && (!data.subSystem || !data.branch)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.required.streamCatalog',
        path: ['subSystem'],
      });
    }
  });

export type PromotionFiltersValues = z.infer<typeof promotionFiltersSchema>;

export const promotionOverrideSchema = z
  .object({
    studentProfileId: z.string().min(1),
    academicYearId: z.string().min(1),
    classId: z.string().optional(),
    finalAction: z.enum(PROMOTION_ACTIONS),
    targetLevelId: z.string().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.finalAction === 'PROMOTE' && !data.targetLevelId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.required.targetLevel',
        path: ['targetLevelId'],
      });
    }
  });

export type PromotionOverrideValues = z.infer<typeof promotionOverrideSchema>;

export const yearRolloverSchema = z
  .object({
    sourceAcademicYearId: z.string().min(1, 'validation.required.sourceYear'),
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
          message: 'validation.required.newYearLabel',
          path: ['targetYearLabel'],
        });
      }
      if (!data.targetYearStartsOn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'validation.required.startDate',
          path: ['targetYearStartsOn'],
        });
      }
      if (!data.targetYearEndsOn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'validation.required.endDate',
          path: ['targetYearEndsOn'],
        });
      }
    } else if (!data.targetAcademicYearId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.required.targetYear',
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
