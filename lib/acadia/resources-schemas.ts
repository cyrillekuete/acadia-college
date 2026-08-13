import { z } from 'zod';

export const learningMaterialKinds = ['DOCUMENT', 'VIDEO', 'LINK', 'OTHER'] as const;

export const schoolResourceTypes = [
  'EQUIPMENT',
  'BOOK',
  'LAB',
  'IT',
  'OTHER',
] as const;

export const resourceAllocationStatuses = ['ACTIVE', 'RETURNED', 'OVERDUE'] as const;

export const resourceRequestStatuses = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'FULFILLED',
  'CANCELLED',
] as const;

export const roomMaintenanceStatuses = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export const learningMaterialSchema = z
  .object({
    titleEn: z.string().min(1, 'validation.required.titleEn'),
    titleFr: z.string().min(1, 'validation.required.titleFr'),
    descriptionEn: z.string().optional(),
    descriptionFr: z.string().optional(),
    kind: z.enum(learningMaterialKinds),
    subjectId: z.string().optional(),
    externalUrl: z.string().url().optional().or(z.literal('')),
    isPublished: z.boolean(),
  })
  .refine(
    (data) => data.kind !== 'LINK' || !!data.externalUrl?.trim(),
    { message: 'validation.required.linkUrl', path: ['externalUrl'] },
  );

export type LearningMaterialFormValues = z.infer<typeof learningMaterialSchema>;

export const schoolResourceSchema = z.object({
  code: z.string().min(1, 'validation.required.code'),
  nameEn: z.string().min(1, 'validation.required.nameEn'),
  nameFr: z.string().min(1, 'validation.required.nameFr'),
  resourceType: z.enum(schoolResourceTypes),
  totalQuantity: z.coerce.number().int().min(1),
  location: z.string().optional(),
  isActive: z.boolean(),
});

export type SchoolResourceFormValues = z.infer<typeof schoolResourceSchema>;

export const resourceAllocationSchema = z.object({
  resourceId: z.string().min(1, 'validation.required.resource'),
  allocatedToUserId: z.string().min(1, 'validation.required.assignee'),
  quantity: z.coerce.number().int().min(1),
  allocatedOn: z.string().min(1, 'validation.required.allocationDate'),
  expectedReturnOn: z.string().optional(),
  notes: z.string().optional(),
});

export type ResourceAllocationFormValues = z.infer<typeof resourceAllocationSchema>;

export const resourceUsageLogSchema = z.object({
  resourceId: z.string().min(1, 'validation.required.resource'),
  userId: z.string().min(1, 'validation.required.user'),
  usedOn: z.string().min(1, 'validation.required.date'),
  quantity: z.coerce.number().int().min(1),
  purpose: z.string().optional(),
});

export type ResourceUsageLogFormValues = z.infer<typeof resourceUsageLogSchema>;

export const resourceRequestSchema = z.object({
  resourceId: z.string().min(1, 'validation.required.resource'),
  quantity: z.coerce.number().int().min(1),
  purpose: z.string().min(1, 'validation.required.purpose'),
});

export type ResourceRequestFormValues = z.infer<typeof resourceRequestSchema>;

export const resourceRequestReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED']),
  reviewNotes: z.string().optional(),
});

export type ResourceRequestReviewValues = z.infer<typeof resourceRequestReviewSchema>;

export const roomMaintenanceSchema = z.object({
  roomId: z.string().min(1, 'validation.required.room'),
  title: z.string().min(1, 'validation.required.title'),
  description: z.string().optional(),
  scheduledOn: z.string().min(1, 'validation.required.scheduledDate'),
  status: z.enum(roomMaintenanceStatuses),
});

export type RoomMaintenanceFormValues = z.infer<typeof roomMaintenanceSchema>;
