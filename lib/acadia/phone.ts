import {
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import {
  COUNTRIES,
  DEFAULT_COUNTRY_NAME,
  getCountryByName,
  type CountryOption,
} from '@/lib/acadia/countries';

export type PhoneSplit = {
  countryName: string;
  nationalNumber: string;
};

const PHONE_PLACEHOLDERS: Record<string, string> = {
  CM: '6XX XXX XXX',
  US: '(555) 555-5555',
  GB: '7XXX XXX XXX',
  FR: '6 XX XX XX XX',
};

function getCountryIso(countryName: string): CountryCode | undefined {
  const country = getCountryByName(countryName);
  return country?.code as CountryCode | undefined;
}

function stripToNationalDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Resolve dial code prefix for a country name, e.g. "Cameroon" → "+237". */
export function getDialCodeForCountryName(countryName: string): string {
  const iso = getCountryIso(countryName);
  if (!iso) {
    return '+';
  }
  try {
    return `+${getCountryCallingCode(iso)}`;
  } catch {
    return '+';
  }
}

/** Country-specific placeholder for the national number input. */
export function getPhonePlaceholder(countryName: string): string {
  const iso = getCountryIso(countryName);
  if (iso && PHONE_PLACEHOLDERS[iso]) {
    return PHONE_PLACEHOLDERS[iso];
  }
  return 'Phone number';
}

/** Validate national digits for a country. Returns an error message or null. */
export function validateNationalPhone(
  countryName: string,
  nationalInput: string,
): string | null {
  const nationalDigits = stripToNationalDigits(nationalInput);
  if (!nationalDigits) {
    return null;
  }

  const iso = getCountryIso(countryName);
  if (!iso) {
    return 'Select a valid country for this phone number.';
  }

  if (iso === 'CM' && !nationalDigits.startsWith('6')) {
    return 'Cameroon mobile numbers must start with 6.';
  }

  const dialCode = getDialCodeForCountryName(countryName);
  const parsed = parsePhoneNumberFromString(
    `${dialCode}${nationalDigits}`,
    iso,
  );
  if (!parsed?.isValid()) {
    return 'Enter a valid phone number for the selected country.';
  }

  return null;
}

/** Merge country + national digits into E.164 format. */
export function composePhoneE164(
  countryName: string,
  nationalInput: string,
): string {
  const nationalDigits = stripToNationalDigits(nationalInput);
  if (!nationalDigits) {
    return '';
  }

  const error = validateNationalPhone(countryName, nationalDigits);
  if (error) {
    throw new Error(error);
  }

  const iso = getCountryIso(countryName);
  if (!iso) {
    throw new Error('Select a valid country for this phone number.');
  }

  const dialCode = getDialCodeForCountryName(countryName);
  const parsed = parsePhoneNumberFromString(
    `${dialCode}${nationalDigits}`,
    iso,
  );
  if (!parsed?.isValid()) {
    throw new Error('Enter a valid phone number for the selected country.');
  }

  return parsed.format('E.164');
}

/** Split stored E.164 (or legacy local) phone into country + national parts. */
export function splitPhoneE164(
  phone: string | null | undefined,
  fallbackCountryName: string = DEFAULT_COUNTRY_NAME,
): PhoneSplit {
  const trimmed = phone?.trim() ?? '';
  if (!trimmed) {
    return { countryName: fallbackCountryName, nationalNumber: '' };
  }

  const parsed = parsePhoneNumberFromString(trimmed);
  if (parsed?.country) {
    const country = findCountryByIso(parsed.country);
    return {
      countryName: country?.name ?? fallbackCountryName,
      nationalNumber: parsed.nationalNumber,
    };
  }

  const digits = stripToNationalDigits(trimmed);
  if (digits.startsWith('237') && digits.length > 9) {
    return {
      countryName: 'Cameroon',
      nationalNumber: digits.slice(3).replace(/^0+/, ''),
    };
  }

  return {
    countryName: fallbackCountryName,
    nationalNumber: digits.replace(/^0+/, ''),
  };
}

function findCountryByIso(iso: CountryCode): CountryOption | undefined {
  return COUNTRIES.find((country) => country.code === iso);
}

/** Normalize phone for lookup and stable system-email keys. */
export function normalizePhoneForLookup(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) {
    return '';
  }

  const parsed = parsePhoneNumberFromString(trimmed);
  if (parsed?.isValid()) {
    return parsed.nationalNumber;
  }

  let digits = stripToNationalDigits(trimmed);
  if (digits.startsWith('237') && digits.length > 9) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length > 9) {
    digits = digits.slice(1);
  }
  return digits;
}

/** Format stored phone for display, e.g. "+237 677 123 456". */
export function formatPhoneForDisplay(
  phone: string | null | undefined,
): string {
  const trimmed = phone?.trim() ?? '';
  if (!trimmed) {
    return '';
  }

  const parsed = parsePhoneNumberFromString(trimmed);
  if (parsed?.isValid()) {
    return parsed.formatInternational();
  }

  return trimmed;
}
