import { z } from 'zod';

export const CALENDAR_MILESTONE_KINDS = [
  'ENROLLMENT_OPEN',
  'ENROLLMENT_CLOSE',
  'MARK_ENTRY_OPEN',
  'MARK_ENTRY_CLOSE',
  'INSTRUCTION_START',
  'INSTRUCTION_END',
  'EXAM_PERIOD_START',
  'EXAM_PERIOD_END',
] as const;

export type CalendarMilestoneKind = (typeof CALENDAR_MILESTONE_KINDS)[number];

const dateString = z
  .string()
  .min(1, 'Date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const academicYearSchema = z
  .object({
    label: z.string().trim().min(1, 'Label is required'),
    startsOn: dateString,
    endsOn: dateString,
    isCurrent: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((v) => v.endsOn >= v.startsOn, {
    message: 'End date must be on or after start date',
    path: ['endsOn'],
  });

export type AcademicYearFormValues = z.infer<typeof academicYearSchema>;

export const termSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required'),
  number: z.coerce.number().int().min(1).max(3),
  levelId: z.string().optional(),
});

export type TermFormValues = z.infer<typeof termSchema>;

export const sequenceSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required'),
  termId: z.string().min(1, 'Term is required'),
  number: z.coerce.number().int().min(1).max(6),
  numberInTerm: z.coerce.number().int().min(1).max(2),
});

export type SequenceFormValues = z.infer<typeof sequenceSchema>;

export const calendarMilestoneSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required'),
  kind: z.enum(CALENDAR_MILESTONE_KINDS),
  onDate: dateString,
  termId: z.string().optional(),
  labelEn: z.string().optional(),
  labelFr: z.string().optional(),
});

export type CalendarMilestoneFormValues = z.infer<typeof calendarMilestoneSchema>;
