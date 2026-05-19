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
    .email({ message: 'Please enter a valid email address.' })
    .min(1, { message: 'Email is required.' }),
  name: z.string().min(1, { message: 'Name is required.' }).max(120),
  roleId: z.string().min(1, { message: 'Role is required.' }),
  status: z.enum(USER_STATUSES).default(UserStatus.ACTIVE),
  password: getPasswordSchema(),
  country: z.string().max(80).optional().or(z.literal('')),
  timezone: z.string().max(80).optional().or(z.literal('')),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  email: z
    .string()
    .email({ message: 'Please enter a valid email address.' })
    .min(1, { message: 'Email is required.' }),
  name: z.string().min(1, { message: 'Name is required.' }).max(120),
  roleId: z.string().min(1, { message: 'Role is required.' }),
  status: z.enum(USER_STATUSES),
  country: z.string().max(80).optional().or(z.literal('')),
  timezone: z.string().max(80).optional().or(z.literal('')),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;

export const tenantSessionSettingsSchema = z
  .object({
    sessionTimeoutMinutes: z.coerce
      .number()
      .int()
      .min(15, { message: 'Session timeout must be at least 15 minutes.' })
      .max(1440, { message: 'Session timeout cannot exceed 24 hours.' }),
    sessionWarningMinutes: z.coerce
      .number()
      .int()
      .min(1, { message: 'Warning must be at least 1 minute.' })
      .max(60, { message: 'Warning cannot exceed 60 minutes.' }),
  })
  .refine((data) => data.sessionWarningMinutes < data.sessionTimeoutMinutes, {
    message: 'Warning time must be less than session timeout.',
    path: ['sessionWarningMinutes'],
  });

export type TenantSessionSettingsValues = z.infer<
  typeof tenantSessionSettingsSchema
>;
