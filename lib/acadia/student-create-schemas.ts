import { z } from 'zod';

export const subsystemEnum = z.enum(['english', 'french']);
export const branchEnum = z.enum(['grammar', 'technical', 'commercial']);
export const genderEnum = z.enum(['male', 'female', 'other']);
export const relationshipEnum = z.enum(['father', 'mother', 'guardian', 'other']);

export const studentCreateSchema = z
  .object({
    // Identity
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    middle_name: z.string().optional(),
    date_of_birth: z.string().optional(),
    gender: genderEnum.optional(),
    place_of_birth: z.string().optional(),
    nationality: z.string().optional(),
    religion: z.string().optional(),

    // Contact
    email: z.string().email('Valid student email required'),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),

    // Academic
    subsystem: subsystemEnum.optional(),
    branch: branchEnum.optional(),
    academic_year: z.string().optional(),
    class_id: z.string().optional(),
    class_name: z.string().optional(),
    previous_school: z.string().optional(),
    previous_class: z.string().optional(),
    is_new_student: z.boolean(),
    enrollment_date: z.string().optional(),
    matricule_number: z.string().optional(),

    // Parent section
    parent_name: z.string().min(1, 'Parent / guardian name is required'),
    parent_email: z.string().email('Valid parent email required'),
    parent_phone: z.string().optional(),
    parent_address: z.string().optional(),
    parent_occupation: z.string().optional(),
    parent_relationship: relationshipEnum,

    // Optional medical / emergency
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    emergency_contact_relationship: z.string().optional(),
    blood_group: z.string().optional(),
    allergies: z.string().optional(),
    medical_conditions: z.string().optional(),
  })
  .refine(
    (d) => d.email.trim().toLowerCase() !== d.parent_email.trim().toLowerCase(),
    {
      message: 'Student and parent email addresses must be different.',
      path: ['parent_email'],
    },
  );

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentCreateFormValues = z.input<typeof studentCreateSchema>;
