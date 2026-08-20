import { z } from 'zod';

const countField = (max: number) =>
  z.coerce.number().int().min(0).max(max);

export const classDisciplineDraftSchema = z.object({
  studentProfileId: z.string().min(1),
  absenceHours: countField(999),
  suspensions: countField(99),
  warnings: countField(99),
});

export const classDisciplineSaveSchema = z.object({
  academicYearId: z.string().min(1),
  classId: z.string().min(1),
  termNumber: z.coerce.number().int().min(1).max(12),
  rows: z.array(classDisciplineDraftSchema),
});

export const classDisciplineTermSchema = z
  .string()
  .regex(/^(?:[1-9]|1[0-2])$/, 'Term must be 1–12.');

export type ClassDisciplineDraftValues = z.infer<typeof classDisciplineDraftSchema>;
export type ClassDisciplineSaveValues = z.infer<typeof classDisciplineSaveSchema>;
