import { z } from 'zod';
import { dobInputToIsoDate, optionalDobField } from '@/lib/acadia/dates';
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
    dateOfBirth: optionalDobField(),
    gender: staffGenderEnum.optional(),
    nationality: z.string().max(80).optional().or(z.literal('')),
    idNumber: z.string().max(80).optional().or(z.literal('')),

    personalEmail: z.union([
      z.literal(''),
      z.string().email('validation.email').max(200),
    ]),
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
    classMasterClassIds: z.array(z.string()).default([]),
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

    const teachingClassIds = new Set(data.classIds ?? []);
    for (const classId of data.classMasterClassIds ?? []) {
      if (!teachingClassIds.has(classId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['classMasterClassIds'],
          message: 'validation.classMasterMustTeach',
        });
        break;
      }
    }
  })
  .transform((data) => {
    const {
      phoneCountry: _phoneCountry,
      emergencyContactPhoneCountry: _emergencyPhoneCountry,
      ...rest
    } = data;

    return {
      ...rest,
      dateOfBirth: rest.dateOfBirth
        ? dobInputToIsoDate(rest.dateOfBirth)
        : undefined,
      subjectIds: rest.subjectIds ?? [],
      classIds: rest.classIds ?? [],
      classMasterClassIds: rest.classMasterClassIds ?? [],
      monthlySalary:
        rest.monthlySalary === undefined || Number.isNaN(rest.monthlySalary)
          ? undefined
          : rest.monthlySalary,
    };
  });

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type StaffCreateFormValues = z.input<typeof staffCreateSchema>;

/** Fields validated when leaving each wizard step (1-based). Step 5 is optional — not used for trigger. */
export const STAFF_CREATE_STEP_FIELDS: Record<number, (keyof StaffCreateFormValues)[]> = {
  1: ['title', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'nationality', 'idNumber'],
  2: ['personalEmail', 'phoneCountry', 'phone'],
  3: ['address', 'city', 'region', 'qualifications', 'teachingExperience'],
  4: [
    'subSystem',
    'subjectIds',
    'classIds',
    'classMasterClassIds',
    'academicYearId',
    'employmentType',
    'hireDate',
    'monthlySalary',
  ],
  5: [
    'emergencyContactName',
    'emergencyContactRelationship',
    'emergencyContactPhoneCountry',
    'emergencyContactPhone',
  ],
};

/** Admin PATCH body for staff profile (HR fields + active flag). */
export const staffUpdateSchema = z
  .object({
    title: staffTitleEnum,
    firstName: z.string().min(1, 'validation.required.firstName').max(80),
    lastName: z.string().min(1, 'validation.required.lastName').max(80),
    personalEmail: z.union([
      z.literal(''),
      z.string().email('validation.email').max(200),
    ]),
    phoneCountry: phoneCountryField(),
    phone: phoneNationalField(true, 'validation.required.phone'),
    address: z.string().max(500).optional().or(z.literal('')),
    city: z.string().max(120).optional().or(z.literal('')),
    region: z.string().max(120).optional().or(z.literal('')),
    qualifications: z.string().max(2000).optional().or(z.literal('')),
    teachingExperience: z.string().max(2000).optional().or(z.literal('')),
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
    bio: z.string().max(2000).optional().or(z.literal('')),
    officeRoom: z.string().max(80).optional().or(z.literal('')),
    officePhoneCountry: phoneCountryField(),
    officePhone: phoneNationalField(),
    departmentId: z.string().optional().or(z.literal('')),
    isActive: z.boolean(),
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
    refinePhoneWithCountry(
      data,
      {
        phoneKey: 'officePhone',
        countryKey: 'officePhoneCountry',
      },
      ctx,
    );
  })
  .transform((data) => {
    const {
      phoneCountry: _phoneCountry,
      emergencyContactPhoneCountry: _emergencyPhoneCountry,
      officePhoneCountry: _officePhoneCountry,
      ...rest
    } = data;

    return {
      ...rest,
      monthlySalary:
        rest.monthlySalary === undefined || Number.isNaN(rest.monthlySalary)
          ? undefined
          : rest.monthlySalary,
    };
  });

export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;
export type StaffUpdateFormValues = z.input<typeof staffUpdateSchema>;
