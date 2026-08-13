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
  .min(1, 'validation.required.date')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.dateFormat');

const optionalDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.dateFormat')
  .optional()
  .or(z.literal(''));

const structureFields = {
  termsPerYear: z.coerce
    .number()
    .int()
    .min(1, 'validation.termsMin')
    .max(12, 'validation.termsMax'),
  sequencesPerTerm: z.coerce
    .number()
    .int()
    .min(1, 'validation.sequencesPerTermMin')
    .max(6, 'validation.sequencesPerTermMax'),
  sequencesPerYear: z.coerce
    .number()
    .int()
    .min(1, 'validation.sequencesPerYearMin')
    .max(24, 'validation.sequencesPerYearMax'),
};

export const academicYearStructureSchema = z
  .object(structureFields)
  .refine((v) => v.sequencesPerYear >= v.termsPerYear, {
    message: 'validation.sequencesVsTerms',
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
    message: 'validation.required.sequencesPerYear',
    path: ['sequencesPerYear'],
  });

export type SequencesStructureFormValues = z.infer<typeof sequencesStructureSchema>;

export const academicYearSchema = z
  .object({
    label: z.string().trim().min(1, 'validation.required.label'),
    startsOn: dateString,
    endsOn: dateString,
    isCurrent: z.boolean(),
    isActive: z.boolean(),
    termsPerYear: structureFields.termsPerYear,
    sequencesPerTerm: structureFields.sequencesPerTerm,
    sequencesPerYear: structureFields.sequencesPerYear,
    enrollmentOpensAt: optionalDateString,
    enrollmentClosesAt: optionalDateString,
  })
  .refine((v) => v.endsOn >= v.startsOn, {
    message: 'validation.endAfterStart',
    path: ['endsOn'],
  })
  .refine((v) => v.sequencesPerYear >= v.termsPerYear, {
    message: 'validation.sequencesVsTerms',
    path: ['sequencesPerYear'],
  })
  .refine(
    (v) => {
      const open = v.enrollmentOpensAt?.trim();
      const close = v.enrollmentClosesAt?.trim();
      if (!open || !close) {
        return true;
      }
      return close >= open;
    },
    {
      message: 'validation.enrollmentCloseAfterOpen',
      path: ['enrollmentClosesAt'],
    },
  );

export type AcademicYearFormValues = z.infer<typeof academicYearSchema>;

export function termSchemaForStructure(termsPerYear: number) {
  return z.object({
    academicYearId: z.string().min(1, 'validation.required.academicYear'),
    number: z.coerce.number().int().min(1).max(termsPerYear),
    levelId: z.string().optional(),
  });
}

export const termSchema = termSchemaForStructure(12);

export type TermFormValues = z.infer<typeof termSchema>;

export function sequenceSchemaForStructure(sequencesPerYear: number, maxNumberInTerm = 6) {
  return z.object({
    academicYearId: z.string().min(1, 'validation.required.academicYear'),
    termId: z.string().min(1, 'validation.required.term'),
    number: z.coerce.number().int().min(1).max(sequencesPerYear),
    numberInTerm: z.coerce.number().int().min(1).max(maxNumberInTerm),
  });
}

export const sequenceSchema = sequenceSchemaForStructure(24, 6);

export type SequenceFormValues = z.infer<typeof sequenceSchema>;

export const calendarMilestoneSchema = z.object({
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  kind: z.enum(CALENDAR_MILESTONE_KINDS),
  onDate: dateString,
  termId: z.string().optional(),
  labelEn: z.string().optional(),
  labelFr: z.string().optional(),
});

export type CalendarMilestoneFormValues = z.infer<typeof calendarMilestoneSchema>;
