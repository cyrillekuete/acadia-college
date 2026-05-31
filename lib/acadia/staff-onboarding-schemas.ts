import { z } from 'zod';
import { DEFAULT_COUNTRY_NAME } from '@/lib/acadia/countries';
import {
  phoneCountryField,
  phoneNationalField,
  refinePhoneWithCountry,
} from '@/lib/acadia/phone-schemas';
import { staffEmergencyRelationshipEnum } from '@/lib/acadia/staff-create-schemas';

export const staffOnboardingSchema = z
  .object({
    phoneCountry: phoneCountryField(),
    phone: phoneNationalField(true, 'Phone number is required'),
    bio: z.string().max(2000).optional().or(z.literal('')),
    officeRoom: z.string().max(80).optional().or(z.literal('')),
    officePhoneCountry: phoneCountryField(),
    officePhone: phoneNationalField(),
    emergencyContactName: z
      .string()
      .min(1, 'Emergency contact name is required')
      .max(120),
    emergencyContactRelationship: staffEmergencyRelationshipEnum,
    emergencyContactPhoneCountry: phoneCountryField(),
    emergencyContactPhone: phoneNationalField(
      true,
      'Emergency contact phone is required',
    ),
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
        phoneKey: 'officePhone',
        countryKey: 'officePhoneCountry',
      },
      ctx,
    );
    refinePhoneWithCountry(
      data,
      {
        phoneKey: 'emergencyContactPhone',
        countryKey: 'emergencyContactPhoneCountry',
        required: true,
      },
      ctx,
    );
  })
  .transform((data) => {
    const {
      phoneCountry: _phoneCountry,
      officePhoneCountry: _officePhoneCountry,
      emergencyContactPhoneCountry: _emergencyPhoneCountry,
      ...rest
    } = data;

    return rest;
  });

export type StaffOnboardingInput = z.infer<typeof staffOnboardingSchema>;
export type StaffOnboardingFormValues = z.input<typeof staffOnboardingSchema>;

export const staffOnboardingDefaultValues: StaffOnboardingFormValues = {
  phoneCountry: DEFAULT_COUNTRY_NAME,
  phone: '',
  bio: '',
  officeRoom: '',
  officePhoneCountry: DEFAULT_COUNTRY_NAME,
  officePhone: '',
  emergencyContactName: '',
  emergencyContactRelationship: 'spouse',
  emergencyContactPhoneCountry: DEFAULT_COUNTRY_NAME,
  emergencyContactPhone: '',
};
