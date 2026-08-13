import { z } from 'zod';

export const DEFAULT_MIN_PROMOTION_AVERAGE = 10;

export const classPromotionPolicyFormSchema = z.object({
  classId: z.string().min(1, 'validation.required.class'),
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  autoPromotionEnabled: z.boolean(),
  minPromotionAverage: z.coerce
    .number()
    .min(0, 'validation.minAverageMin')
    .max(20, 'validation.minAverageMax'),
  notes: z.string().max(2000).optional(),
});

export type ClassPromotionPolicyFormValues = z.infer<
  typeof classPromotionPolicyFormSchema
>;

export type ClassPromotionPolicyRow = {
  id: string;
  classId: string;
  academicYearId: string;
  autoPromotionEnabled: boolean;
  minPromotionAverage: number;
  notes: string | null;
};
