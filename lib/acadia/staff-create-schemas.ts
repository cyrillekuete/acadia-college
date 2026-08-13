import { z } from 'zod';
import { ACADEMIC_SUB_SYSTEMS } from '@/lib/acadia/education-system';
import {
  phoneCountryField,
  phoneNationalField,
  refinePhoneWithCountry,
} from '@/lib/acadia/phone-schemas';

export const staffEmploymentTypeEnum = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'ADJUNCT',
  'VISITING',
]);

export const staffTitleEnum = z.enum([
  'Mr',
  'Mrs',
  'Ms',
  'Miss',
  'Dr',
  'Prof',
  'Rev',
  'Other',
]);

export const staffGenderEnum = z.enum(['male', 'female']);

export const staffEmergencyRelationshipEnum = z.enum([
  'spouse',
  'parent',
  'sibling',
  'child',
  'friend',
  'other',
]);

export const staffCreateSchema = z
  .object({
    title: staffTitleEnum,
    firstName: z.string().min(1, 'validation.required.firstName').max(80),
    lastName: z.string().min(1, 'validation.required.lastName').max(80),
    dateOfBirth: z.string().optional().or(z.literal('')),
    gender: staffGenderEnum.optional(),
    nationality: z.string().max(80).optional().or(z.literal('')),
    idNumber: z.string().max(80).optional().or(z.literal('')),

    personalEmail: z
      .string()
      .email('validation.email')
      .max(200),
    phoneCountry: phoneCountryField(),
    phone: phoneNationalField(true, 'validation.required.phone'),

    address: z.string().max(500).optional().or(z.literal('')),
    city: z.string().max(120).optional().or(z.literal('')),
    region: z.string().max(120).optional().or(z.literal('')),
    qualifications: z.string().max(2000).optional().or(z.literal('')),
    teachingExperience: z.string().max(2000).optional().or(z.literal('')),

    subSystem: z.enum(ACADEMIC_SUB_SYSTEMS),
    subjectIds: z.array(z.string()).default([]),
    classIds: z.array(z.string()).default([]),
    academicYearId: z.string().min(1, 'validation.required.activeAcademicYear'),

    employmentType: staffEmploymentTypeEnum,
    hireDate: z.string().optional().or(z.literal('')),
    monthlySalary: z.coerce
      .number()
      .min(0, 'validation.salaryMin')
      .optional(),
    emergencyContactName: z.string().max(120).optional().or(z.literal('')),
    emergencyContactRelationship: staffEmergencyRelationshipEnum.optional(),
    emergencyContactPhoneCountry: phoneCountryField(),
    emergencyContactPhone: phoneNationalField(),

    staffCode: z.string().max(40).optional().or(z.literal('')),
    departmentId: z.string().optional().or(z.literal('')),
    bio: z.string().max(2000).optional().or(z.literal('')),
    isActive: z.boolean().default(true),
    roleId: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    refinePhoneWithCountry(
      data,
      { phoneKey: 'phone', countryKey: 'phoneCountry', required: true },
      ctx,
    );
    refinePhoneWithCountry(
      data,
      {
        phoneKey: 'emergencyContactPhone',
        countryKey: 'emergencyContactPhoneCountry',
      },
      ctx,
    );
  })
  .transform((data) => {
    const {
      phoneCountry: _phoneCountry,
      emergencyContactPhoneCountry: _emergencyPhoneCountry,
      ...rest
    } = data;

    return {
      ...rest,
      subjectIds: rest.subjectIds ?? [],
      classIds: rest.classIds ?? [],
      monthlySalary:
        rest.monthlySalary === undefined || Number.isNaN(rest.monthlySalary)
          ? undefined
          : rest.monthlySalary,
    };
  });

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type StaffCreateFormValues = z.input<typeof staffCreateSchema>;
