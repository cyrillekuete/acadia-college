import { z } from 'zod';

export const studentProfileEditSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(1, 'Matricule is required.')
    .max(40),
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

export const studentClassMigrationSchema = z.object({
  specialtyId: z.string().min(1, 'Specialty is required.'),
  levelId: z.string().min(1, 'Level is required.'),
  academicYearId: z.string().min(1, 'Academic year is required.'),
  note: z.string().max(500).optional().or(z.literal('')),
});

export type StudentClassMigrationValues = z.infer<
  typeof studentClassMigrationSchema
>;
