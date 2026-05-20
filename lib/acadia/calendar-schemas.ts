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

const structureFields = {
  termsPerYear: z.coerce
    .number()
    .int()
    .min(1, 'At least 1 term')
    .max(12, 'At most 12 terms'),
  sequencesPerTerm: z.coerce
    .number()
    .int()
    .min(1, 'At least 1 sequence per term')
    .max(6, 'At most 6 sequences per term'),
  sequencesPerYear: z.coerce
    .number()
    .int()
    .min(1, 'At least 1 sequence per year')
    .max(24, 'At most 24 sequences per year'),
};

export const academicYearStructureSchema = z
  .object(structureFields)
  .refine((v) => v.sequencesPerYear >= v.termsPerYear, {
    message: 'Sequences per year must be at least equal to terms per year',
    path: ['sequencesPerYear'],
  });

export type AcademicYearStructureFormValues = z.infer<typeof academicYearStructureSchema>;

export const termsStructureSchema = z.object({
  termsPerYear: structureFields.termsPerYear,
});

export type TermsStructureFormValues = z.infer<typeof termsStructureSchema>;

export const sequencesStructureSchema = z
  .object({
    sequencesPerTerm: structureFields.sequencesPerTerm,
    sequencesPerYear: structureFields.sequencesPerYear,
  })
  .refine((v) => v.sequencesPerYear >= 1, {
    message: 'Sequences per year is required',
    path: ['sequencesPerYear'],
  });

export type SequencesStructureFormValues = z.infer<typeof sequencesStructureSchema>;

export const academicYearSchema = z
  .object({
    label: z.string().trim().min(1, 'Label is required'),
    startsOn: dateString,
    endsOn: dateString,
    isCurrent: z.boolean(),
    isActive: z.boolean(),
    termsPerYear: structureFields.termsPerYear,
    sequencesPerTerm: structureFields.sequencesPerTerm,
    sequencesPerYear: structureFields.sequencesPerYear,
  })
  .refine((v) => v.endsOn >= v.startsOn, {
    message: 'End date must be on or after start date',
    path: ['endsOn'],
  })
  .refine((v) => v.sequencesPerYear >= v.termsPerYear, {
    message: 'Sequences per year must be at least equal to terms per year',
    path: ['sequencesPerYear'],
  });

export type AcademicYearFormValues = z.infer<typeof academicYearSchema>;

export function termSchemaForStructure(termsPerYear: number) {
  return z.object({
    academicYearId: z.string().min(1, 'Academic year is required'),
    number: z.coerce.number().int().min(1).max(termsPerYear),
    levelId: z.string().optional(),
  });
}

export const termSchema = termSchemaForStructure(12);

export type TermFormValues = z.infer<typeof termSchema>;

export function sequenceSchemaForStructure(sequencesPerYear: number, maxNumberInTerm = 6) {
  return z.object({
    academicYearId: z.string().min(1, 'Academic year is required'),
    termId: z.string().min(1, 'Term is required'),
    number: z.coerce.number().int().min(1).max(sequencesPerYear),
    numberInTerm: z.coerce.number().int().min(1).max(maxNumberInTerm),
  });
}

export const sequenceSchema = sequenceSchemaForStructure(24, 6);

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
