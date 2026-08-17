import { z } from 'zod';
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_KINDS,
  MESSAGE_GROUP_SCOPES,
  NOTIFICATION_EVENTS,
} from '@/lib/acadia/communication';

export const directMessageSchema = z.object({
  recipientUserId: z.string().min(1, 'validation.required.recipient'),
  subjectEn: z.string().min(1, 'validation.required.subjectLine').max(200),
  subjectFr: z.string().max(200).optional(),
  body: z.string().min(1, 'validation.required.message').max(10000),
  sendWhatsApp: z.boolean().optional(),
});

export type DirectMessageFormValues = z.infer<typeof directMessageSchema>;

export const messageReplySchema = z.object({
  body: z.string().min(1, 'validation.required.message').max(10000),
});

export type MessageReplyFormValues = z.infer<typeof messageReplySchema>;

export const groupThreadSchema = z.object({
  subjectEn: z.string().min(1, 'validation.required.subjectLine').max(200),
  subjectFr: z.string().max(200).optional(),
  groupScope: z.enum(MESSAGE_GROUP_SCOPES),
  groupScopeId: z.string().min(1, 'validation.required.scope'),
  memberUserIds: z.array(z.string()).min(1, 'validation.required.member'),
  body: z.string().min(1, 'validation.required.openingMessage').max(10000),
});

export type GroupThreadFormValues = z.infer<typeof groupThreadSchema>;

export const notificationPreferenceSchema = z.object({
  event: z.enum(NOTIFICATION_EVENTS),
  inApp: z.boolean(),
  email: z.boolean(),
});

export type NotificationPreferenceFormValues = z.infer<
  typeof notificationPreferenceSchema
>;

export const announcementSchema = z
  .object({
    kind: z.enum(ANNOUNCEMENT_KINDS),
    titleEn: z.string().min(1, 'validation.required.titleEn').max(200),
    titleFr: z.string().min(1, 'validation.required.titleFr').max(200),
    bodyEn: z.string().max(20000).optional(),
    bodyFr: z.string().max(20000).optional(),
    audience: z.enum(ANNOUNCEMENT_AUDIENCES),
    eventStartsAt: z.string().optional(),
    eventEndsAt: z.string().optional(),
    eventLocation: z.string().max(300).optional(),
    publishAt: z.string().optional(),
    publishNow: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === 'EVENT' && !values.eventStartsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.required.eventStart',
        path: ['eventStartsAt'],
      });
    }
    if (!values.publishNow && !values.publishAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.publishOrSchedule',
        path: ['publishAt'],
      });
    }
  });

export type AnnouncementFormValues = z.infer<typeof announcementSchema>;
