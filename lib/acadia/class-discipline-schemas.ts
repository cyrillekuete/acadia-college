import { z } from 'zod';
import { CLASS_DISCIPLINE_TERMS } from '@/lib/acadia/class-discipline';

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
  termNumber: z.coerce.number().int().min(1).max(3),
  rows: z.array(classDisciplineDraftSchema),
});

export const classDisciplineTermSchema = z.enum(CLASS_DISCIPLINE_TERMS);

export type ClassDisciplineDraftValues = z.infer<typeof classDisciplineDraftSchema>;
export type ClassDisciplineSaveValues = z.infer<typeof classDisciplineSaveSchema>;
