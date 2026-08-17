import { z } from 'zod';
import { ALERT_CHANNELS, ALERT_PRIORITIES } from '@/lib/acadia/alerts';

export const alertSchema = z
  .object({
    titleEn: z.string().min(1, 'validation.required.titleEn').max(200),
    titleFr: z.string().min(1, 'validation.required.titleFr').max(200),
    bodyEn: z.string().max(20000).optional(),
    bodyFr: z.string().max(20000).optional(),
    priority: z.enum(ALERT_PRIORITIES),
    channel: z.enum(ALERT_CHANNELS),
    targetKeys: z.array(z.string()).min(1, 'validation.required.alertTarget'),
    scheduledAt: z.string().optional(),
    sendNow: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.sendNow && !values.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.publishOrSchedule',
        path: ['scheduledAt'],
      });
    }
  });

export type AlertFormValues = z.infer<typeof alertSchema>;

export const alertGroupSchema = z.object({
  name: z.string().min(1, 'validation.required.name').max(120),
  description: z.string().max(500).optional(),
  guardianUserIds: z.array(z.string()).min(1, 'validation.required.member'),
});

export type AlertGroupFormValues = z.infer<typeof alertGroupSchema>;
