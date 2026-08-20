'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  assertCopyRequestRejectNote,
  canFulfillCopyRequest,
  canResolveCopyRequest,
  hasDuplicatePendingCopyRequest,
} from '@/lib/acadia/transcripts';
import type {
  TranscriptCopyRequestCreateValues,
  TranscriptCopyRequestReviewValues,
} from '@/lib/acadia/transcripts-schemas';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { unwrapRelation } from '@/lib/acadia/record-display';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidateTranscriptQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['student-exams-certificates'] });
  void queryClient.invalidateQueries({ queryKey: ['transcript-copy-students'] });
}

async function studentHasReadyTranscript(
  tenantId: string,
  studentProfileId: string,
): Promise<{ hasReadyTranscript: boolean; versionStatus: string | null }> {
  const supabase = requireBrowserClient();
  const { data, error } = await supabase
    .from('Transcript')
    .select(
      `
      id,
      TranscriptVersion!Transcript_currentVersionId_fkey ( status )
    `,
    )
    .eq('tenantId', tenantId)
    .eq('studentProfileId', studentProfileId);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    const version = unwrapRelation<{ status?: string | null }>(
      (row as { TranscriptVersion?: unknown }).TranscriptVersion,
    );
    if (version?.status === 'READY') {
      return { hasReadyTranscript: true, versionStatus: 'READY' };
    }
  }

  const first = unwrapRelation<{ status?: string | null }>(
    (data?.[0] as { TranscriptVersion?: unknown } | undefined)?.TranscriptVersion,
  );
  return {
    hasReadyTranscript: false,
    versionStatus: first?.status ?? null,
  };
}

export function useTranscriptMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId;
  const userId = session?.profile?.id;

  const submitCopyRequest = useMutation({
    mutationFn: async (values: TranscriptCopyRequestCreateValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const studentProfileId = values.studentProfileId.trim();
      const { data: existing, error: existingError } = await supabase
        .from('TranscriptCopyRequest')
        .select('id, studentProfileId, status')
        .eq('tenantId', tenantId)
        .eq('studentProfileId', studentProfileId)
        .eq('status', 'PENDING');
      if (existingError) {
        throw existingError;
      }
      if (
        hasDuplicatePendingCopyRequest(
          (existing ?? []) as Array<{
            id: string;
            studentProfileId: string;
            status: string;
          }>,
          studentProfileId,
        )
      ) {
        throw new Error('A pending copy request already exists for this student.');
      }

      const nowIso = new Date().toISOString();
      const id = generateAcadiaId('tcr');
      const { error } = await supabase.from('TranscriptCopyRequest').insert({
        id,
        tenantId,
        studentProfileId,
        requestedByUserId: userId,
        status: 'PENDING',
        note: values.note?.trim() || null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'transcript.copy_request_submitted',
        entityType: 'TranscriptCopyRequest',
        entityId: id,
        description: `Submitted transcript copy request for ${studentProfileId}`,
      });
    },
    onSuccess: () => {
      invalidateTranscriptQueries(queryClient);
      toast.success('Copy request submitted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const reviewCopyRequest = useMutation({
    mutationFn: async (input: {
      requestId: string;
      studentProfileId: string;
      currentStatus: string;
      values: TranscriptCopyRequestReviewValues;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      if (!canResolveCopyRequest(input.currentStatus, input.values.status)) {
        throw new Error('Only pending copy requests can be fulfilled or rejected.');
      }
      const rejectNote = assertCopyRequestRejectNote(
        input.values.status,
        input.values.note,
      );
      if (!rejectNote.ok) {
        throw new Error(rejectNote.message);
      }
      if (input.values.status === 'FULFILLED') {
        const ready = await studentHasReadyTranscript(
          tenantId,
          input.studentProfileId,
        );
        if (!canFulfillCopyRequest(ready)) {
          throw new Error(
            'Cannot fulfill until this student has a READY transcript.',
          );
        }
      }

      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('TranscriptCopyRequest')
        .update({
          status: input.values.status,
          note: input.values.note?.trim() || null,
          resolvedByUserId: userId,
          resolvedAt: nowIso,
          updatedAt: nowIso,
        })
        .eq('tenantId', tenantId)
        .eq('id', input.requestId);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'transcript.copy_request_reviewed',
        entityType: 'TranscriptCopyRequest',
        entityId: input.requestId,
        description: `Transcript copy request ${input.values.status}`,
      });
    },
    onSuccess: () => {
      invalidateTranscriptQueries(queryClient);
      toast.success('Copy request updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return { submitCopyRequest, reviewCopyRequest };
}
