import { z } from 'zod';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
} from '@/lib/acadia/education-system';

export const studentProfileEditSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(1, 'Student ID is required.')
    .max(40),
  matriculeNumber: z
    .string()
    .max(40, 'Matricule must be at most 40 characters.')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value?.trim() ? value.trim() : null)),
  isActive: z.boolean(),
  alumniDirectoryOptIn: z.boolean(),
  alumniSince: z.string().optional().or(z.literal('')),
  name: z.string().trim().min(1, 'Name is required.').max(120),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Please enter a valid email.'),
  country: z.string().max(80).optional().or(z.literal('')),
  timezone: z.string().max(80).optional().or(z.literal('')),
});

export type StudentProfileEditValues = z.infer<typeof studentProfileEditSchema>;
export type StudentProfileEditFormValues = z.input<typeof studentProfileEditSchema>;

export const studentClassMigrationSchema = z.object({
  subSystem: z.enum(ACADEMIC_SUB_SYSTEMS, {
    required_error: 'Sub-system is required.',
  }),
  branch: z.enum(ACADEMIC_BRANCHES, {
    required_error: 'Branch is required.',
  }),
  levelId: z.string().min(1, 'Level is required.'),
  classId: z.string().optional(),
  academicYearId: z.string().min(1, 'Academic year is required.'),
  note: z.string().max(500).optional().or(z.literal('')),
});

export type StudentClassMigrationValues = z.infer<
  typeof studentClassMigrationSchema
>;
