import { z } from 'zod';
import { DEFAULT_COUNTRY_NAME } from '@/lib/acadia/countries';
import { composePhoneE164, validateNationalPhone } from '@/lib/acadia/phone';

type PhoneWithCountryOptions = {
  phoneKey: string;
  countryKey: string;
  required?: boolean;
  requiredMessage?: string;
};

/** Zod fields for a country + national phone pair (country is UI-only at rest). */
export function phoneCountryField() {
  return z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : DEFAULT_COUNTRY_NAME));
}

export function phoneNationalField(required = false, requiredMessage?: string) {
  if (required) {
    return z
      .string()
      .transform((value) => value.trim())
      .pipe(
        z
          .string()
          .min(1, requiredMessage ?? 'validation.required.phone'),
      );
  }

  return z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? '');
}

/** Validate and compose E.164 from paired country + national phone values. */
export function refinePhoneWithCountry(
  data: Record<string, unknown>,
  options: PhoneWithCountryOptions,
  ctx: z.RefinementCtx,
): void {
  const { phoneKey, countryKey, required = false, requiredMessage } = options;
  const countryName =
    typeof data[countryKey] === 'string' && data[countryKey].trim()
      ? data[countryKey].trim()
      : DEFAULT_COUNTRY_NAME;
  const national =
    typeof data[phoneKey] === 'string' ? data[phoneKey].trim() : '';

  if (!national) {
    if (required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: requiredMessage ?? 'validation.required.phone',
        path: [phoneKey],
      });
    }
    return;
  }

  const validationError = validateNationalPhone(countryName, national);
  if (validationError) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: validationError,
      path: [phoneKey],
    });
    return;
  }

  try {
    data[phoneKey] = composePhoneE164(countryName, national);
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        error instanceof Error
          ? error.message
          : 'validation.phoneInvalid',
      path: [phoneKey],
    });
  }
}

/** Strip UI-only country keys before persisting. */
export function omitPhoneCountryFields<T extends Record<string, unknown>>(
  data: T,
  countryKeys: string[],
): Partial<T> {
  const result = { ...data };
  for (const key of countryKeys) {
    delete result[key];
  }
  return result;
}
