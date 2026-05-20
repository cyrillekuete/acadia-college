import { z } from 'zod';

export const staffEmploymentTypeEnum = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'ADJUNCT',
  'VISITING',
]);

export const staffCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().email('Valid email is required'),
  employmentType: staffEmploymentTypeEnum,
  staffCode: z.string().max(40).optional().or(z.literal('')),
  title: z.string().max(120).optional().or(z.literal('')),
  departmentId: z.string().optional().or(z.literal('')),
  hireDate: z.string().optional().or(z.literal('')),
  officePhone: z.string().max(40).optional().or(z.literal('')),
  officeRoom: z.string().max(40).optional().or(z.literal('')),
  bio: z.string().max(2000).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  roleId: z.string().optional().or(z.literal('')),
});

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type StaffCreateFormValues = z.input<typeof staffCreateSchema>;
