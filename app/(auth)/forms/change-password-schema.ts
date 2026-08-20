import { z } from 'zod';
import { getPasswordSchema } from './password-schema';

export const getChangePasswordSchema = () => {
  return z
    .object({
      newPassword: getPasswordSchema(),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'validation.passwordMismatch',
      path: ['confirmPassword'],
    });
};

export type ChangePasswordSchemaType = z.infer<
  ReturnType<typeof getChangePasswordSchema>
>;

export const getSignedInChangePasswordSchema = () => {
  return z
    .object({
      currentPassword: z.string().min(1, { message: 'Current password is required.' }),
      newPassword: getPasswordSchema(),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'validation.passwordMismatch',
      path: ['confirmPassword'],
    });
};

export type SignedInChangePasswordSchemaType = z.infer<
  ReturnType<typeof getSignedInChangePasswordSchema>
>;

export const getChangePasswordApiSchema = () => {
  return z.object({
    token: z.string().nonempty({
      message: 'validation.required.token',
    }),
    newPassword: getPasswordSchema(),
  });
};

export type ChangePasswordApiSchemaType = z.infer<
  ReturnType<typeof getChangePasswordApiSchema>
>;
