'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { DirectionProvider as RadixDirectionProvider } from '@radix-ui/react-direction';
import { I18N_LANGUAGES, I18N_SUPPORTED_LNGS } from '@/i18n/config';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {
  LANGUAGE_COOKIE,
  LANGUAGE_COOKIE_MAX_AGE,
  parseUiLocale,
} from '@/lib/acadia/locale';

import enTranslations from '@/i18n/messages/en.json';
import frTranslations from '@/i18n/messages/fr.json';

if (!i18n.isInitialized) {
  i18n.use(LanguageDetector).use(initReactI18next).init({
    resources: {
      en: { translation: enTranslations },
      fr: { translation: frTranslations },
    },
    fallbackLng: 'en',
    supportedLngs: I18N_SUPPORTED_LNGS,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['cookie', 'localStorage'],
      lookupCookie: LANGUAGE_COOKIE,
      lookupLocalStorage: LANGUAGE_COOKIE,
      cookieMinutes: LANGUAGE_COOKIE_MAX_AGE / 60,
      cookieOptions: { path: '/', sameSite: 'lax' },
    },
    react: {
      useSuspense: false,
    },
  });
}

interface I18nProviderProps {
  children: ReactNode;
}

function applyDocumentLanguage(lng: string) {
  if (typeof document === 'undefined') {
    return;
  }
  const locale = parseUiLocale(lng);
  document.documentElement.lang = locale;
  document.documentElement.setAttribute('dir', 'ltr');
}

function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    applyDocumentLanguage(i18n.language);

    const handleLanguageChange = (lng: string) => {
      applyDocumentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <RadixDirectionProvider dir="ltr">{children}</RadixDirectionProvider>
    </I18nextProvider>
  );
}

const useLanguage = () => {
  const [languageCode, setLanguageCode] = useState(
    parseUiLocale(i18n.language),
  );
  const [currentLanguage, setCurrentLanguage] = useState(
    () =>
      I18N_LANGUAGES.find((lang) => lang.code === parseUiLocale(i18n.language)) ||
      I18N_LANGUAGES[0],
  );

  useEffect(() => {
    const handleChange = (lng: string) => {
      const locale = parseUiLocale(lng);
      setLanguageCode(locale);
      setCurrentLanguage(
        I18N_LANGUAGES.find((lang) => lang.code === locale) || I18N_LANGUAGES[0],
      );
    };

    handleChange(i18n.language || 'en');

    i18n.on('languageChanged', handleChange);
    return () => {
      i18n.off('languageChanged', handleChange);
    };
  }, []);

  const changeLanguage = useCallback((code: string) => {
    return i18n.changeLanguage(parseUiLocale(code));
  }, []);

  return {
    languageCode,
    language: currentLanguage,
    changeLanguage,
  };
};

export { I18nProvider, useLanguage };
