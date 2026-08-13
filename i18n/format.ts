import i18n from 'i18next';
import { DEFAULT_FEE_CURRENCY } from '@/lib/acadia/finance';
import { getUiLocale, intlLocale, parseUiLocale, type UiLocale } from '@/lib/acadia/locale';

const DEFAULT_CURRENCY = DEFAULT_FEE_CURRENCY;

function resolveLocale(locale?: string): string {
  const ui: UiLocale = locale
    ? parseUiLocale(locale)
    : i18n.isInitialized
      ? getUiLocale()
      : 'en';
  return intlLocale(ui);
}

function usesHour12(locale: string): boolean {
  return !locale.startsWith('fr');
}

export const formatDate = (date: Date | string): string => {
  const locale = resolveLocale();
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsedDate);
};

export const formatDateTime = (date: Date | string): string => {
  const locale = resolveLocale();
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: usesHour12(locale),
  }).format(parsedDate);
};

export const formatTime = (date: Date | string): string => {
  const locale = resolveLocale();
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: usesHour12(locale),
  }).format(parsedDate);
};

export const formatMoney = (
  amount: number,
  currency: string = DEFAULT_CURRENCY,
): string => {
  const locale = resolveLocale();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};
