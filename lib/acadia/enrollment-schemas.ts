import { z } from 'zod';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
} from '@/lib/acadia/education-system';

export const ENROLLMENT_APPLICATION_KINDS = ['NEW', 'RE_ENROLL'] as const;
export const ENROLLMENT_APPLICATION_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
] as const;

const dateString = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((v) => (v?.trim() ? v.trim() : undefined));

const catalogFields = {
  subSystem: z.enum(ACADEMIC_SUB_SYSTEMS, {
    required_error: 'Sub-system is required.',
  }),
  branch: z.enum(ACADEMIC_BRANCHES, {
    required_error: 'Branch is required.',
  }),
  specialtyId: z.string().min(1, 'Specialty is required.'),
  levelId: z.string().min(1, 'Level is required.'),
  academicYearId: z.string().min(1, 'Academic year is required.'),
};

export const enrollmentApplicationSchema = z.object({
  kind: z.enum(ENROLLMENT_APPLICATION_KINDS),
  firstNameEn: z.string().trim().min(1, 'First name (English) is required.'),
  lastNameEn: z.string().trim().min(1, 'Last name (English) is required.'),
  firstNameFr: z.string().optional().or(z.literal('')),
  lastNameFr: z.string().optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Please enter a valid email.'),
  phone: z.string().optional().or(z.literal('')),
  dateOfBirth: dateString,
  preferredLocale: z.enum(['en', 'fr']),
  studentProfileId: z.string().optional().or(z.literal('')),
  ...catalogFields,
});

export type EnrollmentApplicationFormValues = z.infer<
  typeof enrollmentApplicationSchema
>;

export const reviewApplicationSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('approve'),
  }),
  z.object({
    decision: z.literal('reject'),
    rejectionReason: z
      .string()
      .trim()
      .min(1, 'Rejection reason is required.'),
  }),
]);

export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;
