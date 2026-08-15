import { z } from 'zod';
import {
  SCHEME_OF_WORK_STATUSES,
  SCHEME_OF_WORK_WEEK_MAX,
  SCHEME_OF_WORK_WEEK_MIN,
} from '@/lib/acadia/scheme-of-work';

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
  termId: z.string().min(1, 'validation.required.term'),
  weekNumber: z.coerce
    .number()
    .int()
    .min(SCHEME_OF_WORK_WEEK_MIN, 'schemeOfWork.validation.week')
    .max(SCHEME_OF_WORK_WEEK_MAX, 'schemeOfWork.validation.week'),
  titleEn: z.string().trim().min(1, 'validation.required.titleEn'),
  titleFr: z.string().trim().optional().or(z.literal('')),
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
