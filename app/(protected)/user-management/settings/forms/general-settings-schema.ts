import { z } from 'zod';
import {
  phoneCountryField,
  phoneNationalField,
  refinePhoneWithCountry,
} from '@/lib/acadia/phone-schemas';

export const GeneralSettingsSchema = z
  .object({
  name: z.string().min(1, 'validation.required.companyName'),
  logoFile: z
    .instanceof(File)
    .nullable()
    .optional()
    .refine(
      (file) => !file || file.size <= 1024 * 1024, // Check if file is not present or <= 1MB
      { message: 'validation.logoMaxSize' },
    ),
  logoAction: z.string().optional(),
  active: z.boolean(),
  address: z.string().nullable().optional(),
  websiteURL: z
    .string()
    .url('validation.url')
    .or(z.literal(''))
    .optional(),
  supportEmail: z.string().email('validation.email'),
  supportPhoneCountry: phoneCountryField(),
  supportPhone: phoneNationalField(),
  language: z.string(),
  timezone: z.string(),
  currency: z.string(),
  currencyFormat: z.string(),
})
  .superRefine((data, ctx) => {
    refinePhoneWithCountry(
      data,
      { phoneKey: 'supportPhone', countryKey: 'supportPhoneCountry' },
      ctx,
    );
  })
  .transform((data) => {
    const { supportPhoneCountry: _supportPhoneCountry, ...rest } = data;
    return {
      ...rest,
      supportPhone: rest.supportPhone?.trim() ? rest.supportPhone : undefined,
    };
  });

export type GeneralSettingsSchemaType = z.infer<typeof GeneralSettingsSchema>;
export type GeneralSettingsFormValues = z.input<typeof GeneralSettingsSchema>;
