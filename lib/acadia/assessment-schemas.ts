import { z } from 'zod';
import { EXAM_SESSION_TYPES } from '@/lib/acadia/assessment';

const scoreField = z
  .union([z.coerce.number().min(0).max(20), z.literal('')])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

export const examSessionSchema = z
  .object({
    academicYearId: z.string().min(1, 'Academic year is required.'),
    subjectId: z.string().min(1, 'Subject is required.'),
    termId: z.string().min(1, 'Term is required.'),
    sequenceId: z.string().optional().or(z.literal('')),
    type: z.enum(EXAM_SESSION_TYPES),
    startsOn: z.string().min(1, 'Start date is required.'),
    endsOn: z.string().min(1, 'End date is required.'),
  })
  .refine((data) => data.endsOn >= data.startsOn, {
    message: 'End date must be on or after the start date.',
    path: ['endsOn'],
  });

export type ExamSessionFormValues = z.infer<typeof examSessionSchema>;

export const subjectMarkEntrySchema = z.object({
  studentProfileId: z.string().min(1),
  caScore: scoreField,
  examScore: scoreField,
  isResitEligible: z.boolean().optional(),
});

export type SubjectMarkEntryValues = z.infer<typeof subjectMarkEntrySchema>;

export const marksEntryContextSchema = z.object({
  academicYearId: z.string().min(1),
  sequenceId: z.string().min(1),
  subjectId: z.string().min(1),
  examSessionId: z.string().min(1),
  marks: z.array(subjectMarkEntrySchema),
});

export type MarksEntryContextValues = z.infer<typeof marksEntryContextSchema>;

export const academicReportFiltersSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required.'),
  specialtyId: z.string().min(1, 'Specialty is required.'),
  levelId: z.string().min(1, 'Level is required.'),
  termId: z.string().optional().or(z.literal('')),
  sequenceId: z.string().optional().or(z.literal('')),
});

export type AcademicReportFiltersValues = z.infer<
  typeof academicReportFiltersSchema
>;
