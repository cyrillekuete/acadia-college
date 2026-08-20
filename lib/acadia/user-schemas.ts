import { z } from 'zod';
import { getPasswordSchema } from '@/app/(auth)/forms/password-schema';
import { UserStatus } from '@/app/models/user';

export const USER_STATUSES = [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.BLOCKED,
] as const;

export const createUserSchema = z.object({
  email: z
    .string()
    .email({ message: 'validation.email' })
    .min(1, { message: 'validation.required.email' }),
  name: z.string().min(1, { message: 'validation.required.name' }).max(120),
  roleId: z.string().min(1, { message: 'validation.required.role' }),
  status: z.enum(USER_STATUSES),
  password: getPasswordSchema(),
  country: z.string().max(80).optional().or(z.literal('')),
  timezone: z.string().max(80).optional().or(z.literal('')),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  email: z
    .string()
    .email({ message: 'validation.email' })
    .min(1, { message: 'validation.required.email' }),
  name: z.string().min(1, { message: 'validation.required.name' }).max(120),
  roleId: z.string().min(1, { message: 'validation.required.role' }),
  status: z.enum(USER_STATUSES),
  country: z.string().max(80).optional().or(z.literal('')),
  timezone: z.string().max(80).optional().or(z.literal('')),
  expectedUpdatedAt: z.string().optional(),
  isTrashed: z.boolean().optional(),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;

export const tenantSessionSettingsSchema = z
  .object({
    sessionTimeoutMinutes: z.coerce
      .number()
      .int()
      .min(15, { message: 'validation.sessionTimeoutMin' })
      .max(1440, { message: 'validation.sessionTimeoutMax' }),
    sessionWarningMinutes: z.coerce
      .number()
      .int()
      .min(1, { message: 'validation.warningMin' })
      .max(60, { message: 'validation.warningMax' }),
  })
  .refine((data) => data.sessionWarningMinutes < data.sessionTimeoutMinutes, {
    message: 'validation.warningBeforeTimeout',
    path: ['sessionWarningMinutes'],
  });

export type TenantSessionSettingsValues = z.infer<
  typeof tenantSessionSettingsSchema
>;
