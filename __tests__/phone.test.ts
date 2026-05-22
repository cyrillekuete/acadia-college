import { describe, expect, it } from 'vitest';
import {
  composePhoneE164,
  formatPhoneForDisplay,
  getDialCodeForCountryName,
  getPhonePlaceholder,
  normalizePhoneForLookup,
  splitPhoneE164,
  validateNationalPhone,
} from '@/lib/acadia/phone';

describe('phone utilities', () => {
  it('resolves dial codes from country names', () => {
    expect(getDialCodeForCountryName('Cameroon')).toBe('+237');
    expect(getDialCodeForCountryName('United States')).toBe('+1');
  });

  it('returns Cameroon-specific placeholder', () => {
    expect(getPhonePlaceholder('Cameroon')).toBe('6XX XXX XXX');
    expect(getPhonePlaceholder('United States')).toBe('(555) 555-5555');
  });

  it('composes Cameroon numbers to E.164', () => {
    expect(composePhoneE164('Cameroon', '677123456')).toBe('+237677123456');
  });

  it('composes US numbers to E.164', () => {
    expect(composePhoneE164('United States', '2025551234')).toBe(
      '+12025551234',
    );
  });

  it('rejects Cameroon numbers not starting with 6', () => {
    expect(validateNationalPhone('Cameroon', '577123456')).toBe(
      'Cameroon mobile numbers must start with 6.',
    );
    expect(() => composePhoneE164('Cameroon', '577123456')).toThrow(
      'Cameroon mobile numbers must start with 6.',
    );
  });

  it('splits E.164 numbers for form prefilling', () => {
    expect(splitPhoneE164('+237677123456')).toEqual({
      countryName: 'Cameroon',
      nationalNumber: '677123456',
    });
  });

  it('normalizes phones for lookup', () => {
    expect(normalizePhoneForLookup('+237 677 123 456')).toBe('677123456');
    expect(normalizePhoneForLookup('677123456')).toBe('677123456');
  });

  it('formats phones for display', () => {
    expect(formatPhoneForDisplay('+237677123456')).toBe('+237 6 77 12 34 56');
  });
});
