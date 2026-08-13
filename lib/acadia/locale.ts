import i18n from 'i18next';

export const UI_LOCALES = ['en', 'fr'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export const LANGUAGE_COOKIE = 'language';
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseUiLocale(value: string | null | undefined): UiLocale {
  if (!value) {
    return 'en';
  }
  const base = value.toLowerCase().split('-')[0];
  return base === 'fr' ? 'fr' : 'en';
}

export function intlLocale(locale: UiLocale = getUiLocale()): string {
  return locale === 'fr' ? 'fr-CM' : 'en-CM';
}

export function getUiLocale(): UiLocale {
  if (i18n.isInitialized && i18n.language) {
    return parseUiLocale(i18n.language);
  }
  return 'en';
}

export function localizedText(
  en: string | null | undefined,
  fr: string | null | undefined,
  locale: UiLocale = getUiLocale(),
): string {
  const primary = locale === 'fr' ? fr : en;
  const fallback = locale === 'fr' ? en : fr;
  return primary?.trim() || fallback?.trim() || '';
}

export function translate(key: string, options?: Record<string, unknown>): string {
  if (!i18n.isInitialized) {
    const fallback = options?.defaultValue;
    return typeof fallback === 'string' ? fallback : key;
  }
  return i18n.t(key, options);
}
