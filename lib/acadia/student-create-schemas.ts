import { z } from 'zod';
import {
  phoneCountryField,
  phoneNationalField,
  refinePhoneWithCountry,
} from '@/lib/acadia/phone-schemas';

export const subsystemEnum = z.enum(['english', 'french']);
export const branchEnum = z.enum(['grammar', 'technical', 'commercial']);
export const genderEnum = z.enum(['male', 'female']);
export const relationshipEnum = z.enum(['father', 'mother', 'guardian', 'other']);

export const studentCreateSchema = z
  .object({
    // Identity
    first_name: z.string().min(1, 'validation.required.firstName'),
    last_name: z.string().min(1, 'validation.required.lastName'),
    middle_name: z.string().optional(),
    date_of_birth: z.string().optional(),
    gender: genderEnum.optional(),
    place_of_birth: z.string().optional(),
    nationality: z.string().optional(),
    religion: z.string().optional(),

    // Contact
    email: z.string().email('validation.email'),
    phone_country: phoneCountryField(),
    phone: phoneNationalField(),
    address: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),

    // Academic
    subsystem: subsystemEnum,
    branch: branchEnum,
    academic_year: z.string().optional(),
    academic_year_id: z.string().min(1, 'validation.required.academicYear'),
    level_id: z.string().min(1, 'validation.required.level'),
    class_id: z.string().optional(),
    class_name: z.string().optional(),
    previous_school: z.string().optional(),
    previous_class: z.string().optional(),
    override_enrollment_window: z.boolean().optional(),
    enrollment_date: z.string().optional(),
    matricule_number: z
      .string()
      .max(40, 'validation.matriculeMax')
      .optional()
      .transform((value) => (value?.trim() ? value.trim() : undefined)),

    // Parent section
    parent_name: z.string().min(1, 'validation.required.parentName'),
    parent_email: z
      .string()
      .optional()
      .transform((value) => (value?.trim() ? value.trim() : ''))
      .refine(
        (value) => !value || z.string().email().safeParse(value).success,
        'validation.email',
      ),
    parent_phone_country: phoneCountryField(),
    parent_phone: phoneNationalField(
      true,
      'validation.required.parentPhone',
    ),
    parent_address: z.string().optional(),
    parent_occupation: z.string().optional(),
    parent_relationship: relationshipEnum,

    // Optional medical / emergency
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone_country: phoneCountryField(),
    emergency_contact_phone: phoneNationalField(),
    emergency_contact_relationship: z.string().optional(),
    blood_group: z.string().optional(),
    allergies: z.string().optional(),
    medical_conditions: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    refinePhoneWithCountry(
      data,
      { phoneKey: 'phone', countryKey: 'phone_country' },
      ctx,
    );
    refinePhoneWithCountry(
      data,
      {
        phoneKey: 'parent_phone',
        countryKey: 'parent_phone_country',
        required: true,
        requiredMessage: 'validation.required.parentPhone',
      },
      ctx,
    );
    refinePhoneWithCountry(
      data,
      {
        phoneKey: 'emergency_contact_phone',
        countryKey: 'emergency_contact_phone_country',
      },
      ctx,
    );
  })
  .transform((data) => {
    const {
      phone_country: _phoneCountry,
      parent_phone_country: _parentPhoneCountry,
      emergency_contact_phone_country: _emergencyPhoneCountry,
      ...rest
    } = data;

    return {
      ...rest,
      phone: rest.phone?.trim() ? rest.phone : undefined,
      emergency_contact_phone: rest.emergency_contact_phone?.trim()
        ? rest.emergency_contact_phone
        : undefined,
    };
  })
  .refine(
    (d) => {
      const parentEmail = d.parent_email.trim().toLowerCase();
      if (!parentEmail) {
        return true;
      }
      return d.email.trim().toLowerCase() !== parentEmail;
    },
    {
      message: 'validation.emailsMustDiffer',
      path: ['parent_email'],
    },
  );

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentCreateFormValues = z.input<typeof studentCreateSchema>;
