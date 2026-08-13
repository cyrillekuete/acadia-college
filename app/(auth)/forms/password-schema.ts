import { z } from 'zod';
import i18n from 'i18next';

export const getPasswordSchema = (minLength = 8) => {
  return z
    .string()
    .min(minLength, {
      message: i18n.t('validation.passwordMin', {
        min: minLength,
        defaultValue: `Password must be at least ${minLength} characters long.`,
      }),
    })
    .regex(/[A-Z]/, {
      message: i18n.t('validation.passwordUpper', {
        defaultValue: 'Password must contain at least one uppercase letter.',
      }),
    })
    .regex(/[a-z]/, {
      message: i18n.t('validation.passwordLower', {
        defaultValue: 'Password must contain at least one lowercase letter.',
      }),
    })
    .regex(/\d/, {
      message: i18n.t('validation.passwordNumber', {
        defaultValue: 'Password must contain at least one number.',
      }),
    })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, {
      message: i18n.t('validation.passwordSpecial', {
        defaultValue: 'Password must contain at least one special character.',
      }),
    });
};
