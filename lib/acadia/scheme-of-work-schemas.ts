import { z } from 'zod';
import { SCHEME_OF_WORK_STATUSES } from '@/lib/acadia/scheme-of-work';

export const schemeOfWorkCreateSchema = z.object({
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  subjectId: z.string().min(1, 'validation.required.subject'),
  levelId: z.string().min(1, 'validation.required.level'),
});

export type SchemeOfWorkCreateValues = z.infer<typeof schemeOfWorkCreateSchema>;

export const schemeOfWorkStatusSchema = z.object({
  status: z.enum(SCHEME_OF_WORK_STATUSES),
});

export type SchemeOfWorkStatusValues = z.infer<typeof schemeOfWorkStatusSchema>;

export const schemeOfWorkTopicSchema = z.object({
  parentTopicId: z.string().trim().optional().or(z.literal('')),
  titleEn: z.string().trim().min(1, 'validation.required.titleEn'),
  titleFr: z.string().trim().min(1, 'validation.required.titleFr'),
  descriptionEn: z.string().optional().or(z.literal('')),
  descriptionFr: z.string().optional().or(z.literal('')),
});

export type SchemeOfWorkTopicFormValues = z.infer<typeof schemeOfWorkTopicSchema>;

export const schemeOfWorkProgressSchema = z.object({
  topicId: z.string().min(1),
  classId: z.string().min(1, 'validation.required.class'),
  completed: z.boolean(),
});

export type SchemeOfWorkProgressValues = z.infer<typeof schemeOfWorkProgressSchema>;
