import { z } from 'zod';
import i18n from 'i18next';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAFF_CODE_PATTERN = /^TCH-\d{4}-\d{5}$/i;

export const getSigninSchema = () => {
  return z.object({
    identifier: z
      .string()
      .min(1, { message: 'validation.required.identifier' })
      .refine(
        (value) => {
          const trimmed = value.trim();
          return (
            EMAIL_PATTERN.test(trimmed) || STAFF_CODE_PATTERN.test(trimmed.toUpperCase())
          );
        },
        { message: 'validation.identifierFormat' },
      ),
    password: z
      .string()
      .min(6, {
        message: i18n.t('validation.passwordMin', {
          min: 6,
          defaultValue: 'Password must be at least 6 characters long.',
        }),
      })
      .min(1, { message: 'validation.required.password' }),
    rememberMe: z.boolean().optional(),
  });
};

export type SigninSchemaType = z.infer<ReturnType<typeof getSigninSchema>>;
