import { z } from 'zod';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
} from '@/lib/acadia/education-system';

export const studentProfileEditSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(1, 'validation.required.studentId')
    .max(40),
  matriculeNumber: z
    .string()
    .max(40, 'validation.matriculeMax')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  isActive: z.boolean(),
  alumniDirectoryOptIn: z.boolean(),
  alumniSince: z.string().optional().or(z.literal('')),
  name: z.string().trim().min(1, 'validation.required.name').max(120),
  email: z
    .string()
    .trim()
    .min(1, 'validation.required.email')
    .email('validation.email'),
  country: z.string().max(80).optional().or(z.literal('')),
  timezone: z.string().max(80).optional().or(z.literal('')),
});

export type StudentProfileEditValues = z.infer<typeof studentProfileEditSchema>;
export type StudentProfileEditFormValues = z.input<typeof studentProfileEditSchema>;

export const studentProfileUpdateApiSchema = studentProfileEditSchema
  .omit({ registrationNumber: true })
  .extend({
    academicYearId: z.string().min(1).optional(),
  });

export type StudentProfileUpdateApiValues = z.infer<
  typeof studentProfileUpdateApiSchema
>;

export const studentClassMigrationSchema = z.object({
  subSystem: z.enum(ACADEMIC_SUB_SYSTEMS, {
    required_error: 'validation.required.subSystem',
  }),
  branch: z.enum(ACADEMIC_BRANCHES, {
    required_error: 'validation.required.branch',
  }),
  levelId: z.string().min(1, 'validation.required.level'),
  classId: z.string().optional(),
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  note: z.string().max(500).optional().or(z.literal('')),
});

export type StudentClassMigrationValues = z.infer<
  typeof studentClassMigrationSchema
>;
