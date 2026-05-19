import { z } from 'zod';
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_KINDS,
  MESSAGE_GROUP_SCOPES,
  NOTIFICATION_EVENTS,
} from '@/lib/acadia/communication';

export const directMessageSchema = z.object({
  recipientUserId: z.string().min(1, 'Select a recipient'),
  subjectEn: z.string().min(1, 'Subject is required').max(200),
  subjectFr: z.string().max(200).optional(),
  body: z.string().min(1, 'Message is required').max(10000),
});

export type DirectMessageFormValues = z.infer<typeof directMessageSchema>;

export const messageReplySchema = z.object({
  body: z.string().min(1, 'Message is required').max(10000),
});

export type MessageReplyFormValues = z.infer<typeof messageReplySchema>;

export const groupThreadSchema = z.object({
  subjectEn: z.string().min(1, 'Subject is required').max(200),
  subjectFr: z.string().max(200).optional(),
  groupScope: z.enum(MESSAGE_GROUP_SCOPES),
  groupScopeId: z.string().min(1, 'Select a scope target'),
  memberUserIds: z.array(z.string()).min(1, 'Add at least one member'),
  body: z.string().min(1, 'Opening message is required').max(10000),
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
    titleEn: z.string().min(1, 'English title is required').max(200),
    titleFr: z.string().min(1, 'French title is required').max(200),
    bodyEn: z.string().max(20000).optional(),
    bodyFr: z.string().max(20000).optional(),
    audience: z.enum(ANNOUNCEMENT_AUDIENCES),
    eventStartsAt: z.string().optional(),
    eventEndsAt: z.string().optional(),
    eventLocation: z.string().max(300).optional(),
    publishAt: z.string().optional(),
    publishNow: z.boolean().default(false),
  })
  .superRefine((values, ctx) => {
    if (values.kind === 'EVENT' && !values.eventStartsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Event start date is required',
        path: ['eventStartsAt'],
      });
    }
    if (!values.publishNow && !values.publishAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choose publish now or schedule a date',
        path: ['publishAt'],
      });
    }
  });

export type AnnouncementFormValues = z.infer<typeof announcementSchema>;
