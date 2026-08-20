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
import type { MilestoneRecord } from '@/lib/acadia/calendar-milestones';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
import { generateAcadiaId } from '@/lib/acadia/ids';
import {
  assertExamSessionEditableForMarks,
  assertMarkEntryCalendarAllowed,
  assertMarkNotStale,
  parseMarksEntryContext,
  type MarkEntryCalendarPolicy,
} from '@/lib/acadia/marks-entry-guards';
import { canManageInstitution } from '@/lib/acadia/roles';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getMutationErrorMessage } from '@/lib/acadia/query-errors';
import {
  assertExamSessionWrite,
  isExamSessionUniqueViolation,
} from '@/lib/supabase/queries/exam-session-write';
import {
  assertExamSessionDeletable,
  fetchExamSessionDeleteBlockers,
} from '@/lib/supabase/queries/exam-session-delete';
import { notifyMarksPublished } from '@/lib/acadia/marks-published-notify';
import { useAcademicYearWriteGuard } from '@/hooks/use-academic-year-write-guard';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  ensureAcademicYearWriteAllowed,
  isWriteCancelledError,
} from '@/lib/acadia/mutation-write-guard';
import { ZodError } from 'zod';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    if (first?.message) {
      return first.message;
    }
    return 'One or more mark values are invalid (scores must be between 0 and 20).';
  }
  return getMutationErrorMessage(error);
}

function handleMutationError(error: unknown) {
  if (isWriteCancelledError(error)) {
    return;
  }
  toast.error(mutationErrorMessage(error));
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
  const { confirmWrite } = useAcademicYearWriteGuard();
  const tenantId = session?.tenantId ?? null;
  const actorUserId = session?.authUser?.id ?? null;
  const skipExamPeriodDates = canManageInstitution(session?.roleSlug);

  const createExamSession = useMutation({
    mutationFn: async (values: ExamSessionFormValues) => {
      await ensureAcademicYearWriteAllowed(confirmWrite);
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await assertExamSessionWrite({
        supabase,
        tenantId,
        values,
        skipExamPeriodDates,
      });
      const id = generateAcadiaId('exam');
      const now = new Date().toISOString();
      const row = buildExamSessionRow(tenantId, id, values, now);

      const { error } = await supabase.from('ExamSession').insert({
        ...row,
        createdAt: now,
      });
      if (error) {
        if (isExamSessionUniqueViolation(error)) {
          throw new Error('An exam session of this type already exists for this subject.');
        }
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
    onError: handleMutationError,
  });

  const updateExamSession = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: ExamSessionFormValues;
    }) => {
      await ensureAcademicYearWriteAllowed(confirmWrite);
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      await assertExamSessionWrite({
        supabase,
        tenantId,
        values,
        ignoreId: id,
        skipExamPeriodDates,
      });
      const now = new Date().toISOString();
      const row = buildExamSessionRow(tenantId, id, values, now);

      const { error } = await supabase.from('ExamSession').update(row).eq('id', id);
      if (error) {
        if (isExamSessionUniqueViolation(error)) {
          throw new Error('An exam session of this type already exists for this subject.');
        }
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
    onError: handleMutationError,
  });

  const finalizeExamSession = useMutation({
    mutationFn: async (examSessionId: string) => {
      await ensureAcademicYearWriteAllowed(confirmWrite);
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { data: sessionRow, error: sessionError } = await supabase
        .from('ExamSession')
        .select('id, academicYearId, subjectId, sequenceId')
        .eq('id', examSessionId)
        .eq('tenantId', tenantId)
        .maybeSingle();
      if (sessionError) {
        throw sessionError;
      }
      if (!sessionRow) {
        throw new Error('Exam session not found.');
      }

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

      try {
        await notifyMarksPublished(supabase, {
          tenantId,
          examSessionId,
          academicYearId: sessionRow.academicYearId as string,
          subjectId: sessionRow.subjectId as string,
        });
      } catch (notifyError) {
        console.error('[marks.published] notify failed', notifyError);
      }
    },
    onSuccess: () => {
      invalidateAssessmentQueries(queryClient);
      toast.success('Exam session finalized.');
    },
    onError: handleMutationError,
  });

  const deleteExamSession = useMutation({
    mutationFn: async (examSessionId: string) => {
      await ensureAcademicYearWriteAllowed(confirmWrite);
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const blockers = await fetchExamSessionDeleteBlockers(
        supabase,
        tenantId,
        examSessionId,
      );
      assertExamSessionDeletable(blockers);

      const { error } = await supabase
        .from('ExamSession')
        .delete()
        .eq('id', examSessionId)
        .eq('tenantId', tenantId);
      if (error) {
        throw error;
      }

      if (actorUserId) {
        await appendSystemLog(supabase, {
          userId: actorUserId,
          event: 'exam_session.deleted',
          entityId: examSessionId,
          entityType: 'ExamSession',
        });
      }
    },
    onSuccess: () => {
      invalidateAssessmentQueries(queryClient);
      toast.success('Exam session deleted.');
      router.push('/exams');
    },
    onError: handleMutationError,
  });

  const saveMarksEntry = useMutation({
    mutationFn: async (rawInput: MarksEntryContextValues) => {
      await ensureAcademicYearWriteAllowed(confirmWrite);
      if (!tenantId || !actorUserId) {
        throw new Error('Tenant and user context are required.');
      }
      const input = parseMarksEntryContext(rawInput);
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { data: examSession, error: examError } = await supabase
        .from('ExamSession')
        .select('id, finalizedAt, startsOn, endsOn, academicYearId')
        .eq('id', input.examSessionId)
        .eq('tenantId', tenantId)
        .maybeSingle();
      if (examError) {
        throw examError;
      }
      if (!examSession) {
        throw new Error('Exam session not found.');
      }

      assertExamSessionEditableForMarks({
        finalizedAt: (examSession.finalizedAt as string | null) ?? null,
      });

      const [{ data: tenant }, { data: milestones, error: milestoneError }] =
        await Promise.all([
          supabase
            .from('Tenant')
            .select('markEntryCalendarPolicy')
            .eq('id', tenantId)
            .maybeSingle(),
          supabase
            .from('AcademicCalendarMilestone')
            .select('kind, onDate, termId, labelEn, labelFr')
            .eq('tenantId', tenantId)
            .eq('academicYearId', input.academicYearId),
        ]);
      if (milestoneError) {
        throw milestoneError;
      }

      const policy =
        (tenant?.markEntryCalendarPolicy as MarkEntryCalendarPolicy | null) ??
        'SESSION_DATES_ONLY';
      assertMarkEntryCalendarAllowed({
        milestones: (milestones ?? []) as MilestoneRecord[],
        policy,
        session: {
          startsOn: (examSession.startsOn as string | null) ?? null,
          endsOn: (examSession.endsOn as string | null) ?? null,
        },
        bypass: canManageInstitution(session?.roleSlug),
      });

      for (const mark of input.marks) {
        let existingQuery = supabase
          .from('SubjectMark')
          .select('id, caScore, examScore, totalScore, updatedAt')
          .eq('tenantId', tenantId)
          .eq('examSessionId', input.examSessionId)
          .eq('studentProfileId', mark.studentProfileId)
          .eq('subjectId', input.subjectId);
        existingQuery = mark.subjectSubBranchId
          ? existingQuery.eq('subjectSubBranchId', mark.subjectSubBranchId)
          : existingQuery.is('subjectSubBranchId', null);
        const { data: existing, error: fetchError } = await existingQuery.maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        assertMarkNotStale({
          existingUpdatedAt: (existing?.updatedAt as string | null) ?? null,
          expectedUpdatedAt: mark.expectedUpdatedAt ?? null,
        });

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
    onError: handleMutationError,
  });

  const ensureSequenceExamSession = useMutation({
    mutationFn: async (input: {
      academicYearId: string;
      subjectId: string;
      termId: string;
      sequenceId: string;
    }) => {
      await ensureAcademicYearWriteAllowed(confirmWrite);
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
      const today = formatLocalDateInputValue();
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
        if (isExamSessionUniqueViolation(error)) {
          const { data: raced, error: racedError } = await supabase
            .from('ExamSession')
            .select('id')
            .eq('tenantId', tenantId)
            .eq('academicYearId', input.academicYearId)
            .eq('subjectId', input.subjectId)
            .eq('sequenceId', input.sequenceId)
            .eq('type', 'NORMAL')
            .maybeSingle();
          if (racedError) {
            throw racedError;
          }
          if (raced?.id) {
            return raced.id as string;
          }
        }
        throw error;
      }
      return id;
    },
    onError: handleMutationError,
  });

  return {
    createExamSession,
    updateExamSession,
    finalizeExamSession,
    deleteExamSession,
    saveMarksEntry,
    ensureSequenceExamSession,
  };
}

export type { SubjectMarkEntryValues };
