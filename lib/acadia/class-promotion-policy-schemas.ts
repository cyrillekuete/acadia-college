import { z } from 'zod';

export const DEFAULT_MIN_PROMOTION_AVERAGE = 10;

export const classPromotionPolicyFormSchema = z.object({
  classId: z.string().min(1, 'Class is required.'),
  academicYearId: z.string().min(1, 'Academic year is required.'),
  autoPromotionEnabled: z.boolean(),
  minPromotionAverage: z.coerce
    .number()
    .min(0, 'Minimum average must be at least 0.')
    .max(20, 'Minimum average cannot exceed 20.'),
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
