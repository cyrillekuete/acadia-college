import { z } from 'zod';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAFF_CODE_PATTERN = /^TCH-\d{4}-\d{5}$/i;

export const getSigninSchema = () => {
  return z.object({
    identifier: z
      .string()
      .min(1, { message: 'Email or Teacher ID is required.' })
      .refine(
        (value) => {
          const trimmed = value.trim();
          return (
            EMAIL_PATTERN.test(trimmed) || STAFF_CODE_PATTERN.test(trimmed.toUpperCase())
          );
        },
        { message: 'Enter a valid email or Teacher ID (e.g. TCH-2026-12345).' },
      ),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long.' })
      .min(1, { message: 'Password is required.' }),
    rememberMe: z.boolean().optional(),
  });
};

export type SigninSchemaType = z.infer<ReturnType<typeof getSigninSchema>>;
