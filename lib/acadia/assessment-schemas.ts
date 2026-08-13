import { z } from 'zod';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
} from '@/lib/acadia/education-system';
import { EXAM_SESSION_TYPES } from '@/lib/acadia/assessment';

const scoreField = z
  .union([z.coerce.number().min(0).max(20), z.literal('')])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

export const examSessionSchema = z
  .object({
    academicYearId: z.string().min(1, 'validation.required.academicYear'),
    subjectId: z.string().min(1, 'validation.required.subject'),
    termId: z.string().min(1, 'validation.required.term'),
    sequenceId: z.string().optional().or(z.literal('')),
    type: z.enum(EXAM_SESSION_TYPES),
    startsOn: z.string().min(1, 'validation.required.startDate'),
    endsOn: z.string().min(1, 'validation.required.endDate'),
  })
  .refine((data) => data.endsOn >= data.startsOn, {
    message: 'validation.endAfterStart',
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
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  subSystem: z.enum(ACADEMIC_SUB_SYSTEMS, {
    required_error: 'validation.required.subSystem',
  }),
  branch: z.enum(ACADEMIC_BRANCHES, {
    required_error: 'validation.required.branch',
  }),
  levelId: z.string().min(1, 'validation.required.level'),
  termId: z.string().optional().or(z.literal('')),
  sequenceId: z.string().optional().or(z.literal('')),
});

export type AcademicReportFiltersValues = z.infer<
  typeof academicReportFiltersSchema
>;
