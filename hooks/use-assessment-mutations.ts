'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  buildSubjectMarkRow,
  buildExamSessionRow,
} from '@/lib/acadia/assessment';
import type {
  SubjectMarkEntryValues,
  ExamSessionFormValues,
  MarksEntryContextValues,
} from '@/lib/acadia/assessment-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidateAssessmentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
  void queryClient.invalidateQueries({ queryKey: ['exam-session-options'] });
  void queryClient.invalidateQueries({ queryKey: ['marks-entry'] });
  void queryClient.invalidateQueries({ queryKey: ['marks-averages'] });
  void queryClient.invalidateQueries({ queryKey: ['marks-audit'] });
  void queryClient.invalidateQueries({ queryKey: ['exam-results'] });
  void queryClient.invalidateQueries({ queryKey: ['academic-report'] });
}

export function useAssessmentMutations() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const actorUserId = session?.authUser?.id ?? null;

  const createExamSession = useMutation({
    mutationFn: async (values: ExamSessionFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const id = generateAcadiaId('exam');
      const now = new Date().toISOString();
      const row = buildExamSessionRow(tenantId, id, values, now);

      const { error } = await supabase.from('ExamSession').insert({
        ...row,
        createdAt: now,
      });
      if (error) {
        throw error;
      }

      if (actorUserId) {
        await appendSystemLog(supabase, {
          userId: actorUserId,
          event: 'exam_session.created',
          entityId: id,
          entityType: 'ExamSession',
          description: `Exam session ${values.type} created`,
        });
      }

      return id;
    },
    onSuccess: (id) => {
      invalidateAssessmentQueries(queryClient);
      toast.success('Exam session created.');
      router.push(`/exams/${id}`);
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateExamSession = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: ExamSessionFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const row = buildExamSessionRow(tenantId, id, values, now);

      const { error } = await supabase.from('ExamSession').update(row).eq('id', id);
      if (error) {
        throw error;
      }

      if (actorUserId) {
        await appendSystemLog(supabase, {
          userId: actorUserId,
          event: 'exam_session.updated',
          entityId: id,
          entityType: 'ExamSession',
        });
      }
    },
    onSuccess: () => {
      invalidateAssessmentQueries(queryClient);
      toast.success('Exam session updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const finalizeExamSession = useMutation({
    mutationFn: async (examSessionId: string) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('ExamSession')
        .update({ finalizedAt: now, updatedAt: now })
        .eq('id', examSessionId);
      if (error) {
        throw error;
      }

      if (actorUserId) {
        await appendSystemLog(supabase, {
          userId: actorUserId,
          event: 'exam_session.finalized',
          entityId: examSessionId,
          entityType: 'ExamSession',
        });
      }
    },
    onSuccess: () => {
      invalidateAssessmentQueries(queryClient);
      toast.success('Exam session finalized.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const saveMarksEntry = useMutation({
    mutationFn: async (input: MarksEntryContextValues) => {
      if (!tenantId || !actorUserId) {
        throw new Error('Tenant and user context are required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      for (const mark of input.marks) {
        const { data: existing, error: fetchError } = await supabase
          .from('SubjectMark')
          .select('id, caScore, examScore, totalScore')
          .eq('tenantId', tenantId)
          .eq('examSessionId', input.examSessionId)
          .eq('studentProfileId', mark.studentProfileId)
          .eq('subjectId', input.subjectId)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        const row = buildSubjectMarkRow(
          tenantId,
          existing?.id ?? generateAcadiaId('mark'),
          {
            examSessionId: input.examSessionId,
            studentProfileId: mark.studentProfileId,
            subjectId: input.subjectId,
            values: mark,
            enteredByUserId: actorUserId,
          },
          now,
        );

        if (existing?.id) {
          const { error } = await supabase
            .from('SubjectMark')
            .update(row)
            .eq('id', existing.id);
          if (error) {
            throw error;
          }
          await appendSystemLog(supabase, {
            userId: actorUserId,
            event: 'subject_mark.updated',
            entityId: existing.id,
            entityType: 'SubjectMark',
            meta: {
              previous: {
                caScore: existing.caScore,
                examScore: existing.examScore,
                totalScore: existing.totalScore,
              },
              current: {
                caScore: row.caScore,
                examScore: row.examScore,
                totalScore: row.totalScore,
              },
            },
          });
        } else {
          const { error } = await supabase.from('SubjectMark').insert({
            ...row,
            createdAt: now,
          });
          if (error) {
            throw error;
          }
          await appendSystemLog(supabase, {
            userId: actorUserId,
            event: 'subject_mark.created',
            entityId: row.id,
            entityType: 'SubjectMark',
            meta: { totalScore: row.totalScore },
          });
        }
      }
    },
    onSuccess: () => {
      invalidateAssessmentQueries(queryClient);
      toast.success('Marks saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const ensureSequenceExamSession = useMutation({
    mutationFn: async (input: {
      academicYearId: string;
      subjectId: string;
      termId: string;
      sequenceId: string;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();

      const { data: existing, error: findError } = await supabase
        .from('ExamSession')
        .select('id')
        .eq('tenantId', tenantId)
        .eq('academicYearId', input.academicYearId)
        .eq('subjectId', input.subjectId)
        .eq('sequenceId', input.sequenceId)
        .eq('type', 'NORMAL')
        .maybeSingle();

      if (findError) {
        throw findError;
      }
      if (existing?.id) {
        return existing.id as string;
      }

      const id = generateAcadiaId('exam');
      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      const { error } = await supabase.from('ExamSession').insert({
        id,
        tenantId,
        academicYearId: input.academicYearId,
        subjectId: input.subjectId,
        termId: input.termId,
        sequenceId: input.sequenceId,
        type: 'NORMAL',
        startsOn: today,
        endsOn: today,
        createdAt: now,
        updatedAt: now,
      });
      if (error) {
        throw error;
      }
      return id;
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    createExamSession,
    updateExamSession,
    finalizeExamSession,
    saveMarksEntry,
    ensureSequenceExamSession,
  };
}

export type { SubjectMarkEntryValues };
