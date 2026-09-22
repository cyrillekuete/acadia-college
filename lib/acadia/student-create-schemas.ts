import { z } from 'zod';
import {
  dobInputToIsoDate,
  formatLocalDateInputValue,
  optionalDobField,
  parseLocalDateInputValue,
} from '@/lib/acadia/dates';
import {
  phoneCountryField,
  phoneNationalField,
  refinePhoneWithCountry,
} from '@/lib/acadia/phone-schemas';

export const subsystemEnum = z.enum(['english', 'french']);
export const branchEnum = z.enum(['grammar', 'technical', 'commercial']);
export const genderEnum = z.enum(['male', 'female']);
export const relationshipEnum = z.enum(['father', 'mother', 'guardian', 'other']);

/** Optional YYYY-MM-DD. Blank and whitespace become undefined. */
function optionalIsoDateField() {
  return z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((value) => value?.trim() ?? '')
    .pipe(
      z
        .string()
        .superRefine((value, ctx) => {
          if (!value) {
            return;
          }
          const parsed = parseLocalDateInputValue(value);
          if (!parsed || formatLocalDateInputValue(parsed) !== value) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'validation.invalid.date',
            });
          }
        })
        .transform((value) => (value ? value : undefined)),
    );
}

export const studentCreateSchema = z
  .object({
    // Identity
    first_name: z.string().min(1, 'validation.required.firstName'),
    last_name: z.string().min(1, 'validation.required.lastName'),
    date_of_birth: optionalDobField(),
    gender: genderEnum.optional(),
    place_of_birth: z.string().optional(),
    nationality: z.string().optional(),
    religion: z.string().optional(),

    // Contact
    email: z
      .string()
      .optional()
      .transform((value) => (value?.trim() ? value.trim() : ''))
      .refine(
        (value) => !value || z.string().email().safeParse(value).success,
        'validation.email',
      ),
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
    is_new_student: z.boolean().optional().default(true),
    enrollment_date: optionalIsoDateField(),
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
      date_of_birth: rest.date_of_birth
        ? dobInputToIsoDate(rest.date_of_birth)
        : undefined,
      phone: rest.phone?.trim() ? rest.phone : undefined,
      emergency_contact_phone: rest.emergency_contact_phone?.trim()
        ? rest.emergency_contact_phone
        : undefined,
    };
  })
  .refine(
    (d) => {
      const studentEmail = d.email.trim().toLowerCase();
      const parentEmail = d.parent_email.trim().toLowerCase();
      if (!studentEmail || !parentEmail) {
        return true;
      }
      return studentEmail !== parentEmail;
    },
    {
      message: 'validation.emailsMustDiffer',
      path: ['parent_email'],
    },
  );

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentCreateFormValues = z.input<typeof studentCreateSchema>;

/** Fields validated when leaving each wizard step (1-based). Step 5 is optional — not used for trigger. */
export const STUDENT_CREATE_STEP_FIELDS: Record<
  number,
  (keyof StudentCreateFormValues)[]
> = {
  1: [
    'first_name',
    'last_name',
    'date_of_birth',
    'gender',
    'place_of_birth',
    'nationality',
    'religion',
  ],
  2: ['email', 'phone_country', 'phone', 'address', 'country', 'city', 'region'],
  3: [
    'subsystem',
    'branch',
    'academic_year',
    'academic_year_id',
    'level_id',
    'class_id',
    'class_name',
    'previous_school',
    'previous_class',
    'override_enrollment_window',
    'is_new_student',
    'enrollment_date',
    'matricule_number',
  ],
  4: [
    'parent_name',
    'parent_email',
    'parent_phone_country',
    'parent_phone',
    'parent_address',
    'parent_occupation',
    'parent_relationship',
  ],
  5: [
    'emergency_contact_name',
    'emergency_contact_phone_country',
    'emergency_contact_phone',
    'emergency_contact_relationship',
    'blood_group',
    'allergies',
    'medical_conditions',
  ],
};
