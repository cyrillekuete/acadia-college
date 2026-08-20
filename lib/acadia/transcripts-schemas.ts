import { z } from 'zod';

export const transcriptCopyRequestStatuses = [
  'PENDING',
  'FULFILLED',
  'REJECTED',
] as const;

export const transcriptVersionStatuses = [
  'PENDING',
  'READY',
  'FAILED',
] as const;

export const transcriptCopyRequestCreateSchema = z.object({
  studentProfileId: z.string().min(1, 'validation.required.student'),
  note: z.string().optional(),
});

export type TranscriptCopyRequestCreateValues = z.infer<
  typeof transcriptCopyRequestCreateSchema
>;

export const transcriptCopyRequestReviewSchema = z
  .object({
    status: z.enum(['FULFILLED', 'REJECTED']),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'REJECTED' && !data.note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.required.rejectionReason',
        path: ['note'],
      });
    }
  });

export type TranscriptCopyRequestReviewValues = z.infer<
  typeof transcriptCopyRequestReviewSchema
>;
