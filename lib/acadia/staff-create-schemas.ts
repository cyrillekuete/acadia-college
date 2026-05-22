import { z } from 'zod';
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

export const staffCreateSchema = z
  .object({
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().email('Valid email is required'),
  employmentType: staffEmploymentTypeEnum,
  staffCode: z.string().max(40).optional().or(z.literal('')),
  title: z.string().max(120).optional().or(z.literal('')),
  departmentId: z.string().optional().or(z.literal('')),
  hireDate: z.string().optional().or(z.literal('')),
  officePhoneCountry: phoneCountryField(),
  officePhone: phoneNationalField(),
  officeRoom: z.string().max(40).optional().or(z.literal('')),
  bio: z.string().max(2000).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  roleId: z.string().optional().or(z.literal('')),
})
  .superRefine((data, ctx) => {
    refinePhoneWithCountry(
      data,
      { phoneKey: 'officePhone', countryKey: 'officePhoneCountry' },
      ctx,
    );
  })
  .transform((data) => {
    const { officePhoneCountry: _officePhoneCountry, ...rest } = data;
    return {
      ...rest,
      officePhone: rest.officePhone?.trim() ? rest.officePhone : '',
    };
  });

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type StaffCreateFormValues = z.input<typeof staffCreateSchema>;
