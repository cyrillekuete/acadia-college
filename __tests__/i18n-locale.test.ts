import { describe, expect, it } from 'vitest';
import { I18N_LANGUAGES, I18N_SUPPORTED_LNGS } from '@/i18n/config';
import {
  localizedText,
  parseUiLocale,
  intlLocale,
} from '@/lib/acadia/locale';

describe('I18N_LANGUAGES', () => {
  it('supports only English and French', () => {
    expect(I18N_SUPPORTED_LNGS).toEqual(['en', 'fr']);
    expect(I18N_LANGUAGES.map((language) => language.code)).toEqual(['en', 'fr']);
  });
});

describe('parseUiLocale', () => {
  it('maps French variants to fr', () => {
    expect(parseUiLocale('fr')).toBe('fr');
    expect(parseUiLocale('fr-CM')).toBe('fr');
    expect(parseUiLocale('fr-FR')).toBe('fr');
  });

  it('falls back to English', () => {
    expect(parseUiLocale('en')).toBe('en');
    expect(parseUiLocale('en-CM')).toBe('en');
    expect(parseUiLocale('ar')).toBe('en');
    expect(parseUiLocale(undefined)).toBe('en');
  });
});

describe('intlLocale', () => {
  it('uses Cameroon locales', () => {
    expect(intlLocale('en')).toBe('en-CM');
    expect(intlLocale('fr')).toBe('fr-CM');
  });
});

describe('localizedText', () => {
  it('prefers English then falls back to French', () => {
    expect(localizedText('Form 1', 'Sixième', 'en')).toBe('Form 1');
    expect(localizedText('', 'Sixième', 'en')).toBe('Sixième');
    expect(localizedText('  Form 1  ', 'Sixième', 'en')).toBe('Form 1');
  });

  it('prefers French then falls back to English', () => {
    expect(localizedText('Form 1', 'Sixième', 'fr')).toBe('Sixième');
    expect(localizedText('Form 1', '', 'fr')).toBe('Form 1');
    expect(localizedText('Form 1', null, 'fr')).toBe('Form 1');
  });

  it('returns empty string when both are blank', () => {
    expect(localizedText('', '', 'en')).toBe('');
    expect(localizedText(null, undefined, 'fr')).toBe('');
  });
});
