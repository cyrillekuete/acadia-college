import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExamSessionFormValues } from '@/lib/acadia/assessment-schemas';
import { loadExamPeriodBoundsForYear } from '@/lib/acadia/exam-period-window';
import {
  assertExamSessionDates,
  assertExamSessionPlacement,
  assertExamSessionUnique,
  assertExamSessionUpdateAllowed,
  type ExamSessionDuplicateRow,
} from '@/lib/acadia/exam-session-guards';
import { throwMutationError } from '@/lib/acadia/query-errors';

type Client = SupabaseClient;

export async function assertExamSessionWrite(input: {
  supabase: Client;
  tenantId: string;
  values: ExamSessionFormValues;
  ignoreId?: string | null;
  skipExamPeriodDates?: boolean;
}): Promise<void> {
  const { supabase, tenantId, values, ignoreId, skipExamPeriodDates } = input;

  const [
    { data: year, error: yearError },
    { data: term, error: termError },
    { data: existing, error: existingError },
  ] = await Promise.all([
    supabase
      .from('AcademicYear')
      .select('id, startsOn, endsOn')
      .eq('tenantId', tenantId)
      .eq('id', values.academicYearId)
      .maybeSingle(),
    supabase
      .from('Term')
      .select('id, academicYearId')
      .eq('tenantId', tenantId)
      .eq('id', values.termId)
      .maybeSingle(),
    supabase
      .from('ExamSession')
      .select('id, type, academicYearId, subjectId, sequenceId')
      .eq('tenantId', tenantId)
      .eq('academicYearId', values.academicYearId)
      .eq('subjectId', values.subjectId),
  ]);

  if (yearError) {
    throwMutationError(yearError);
  }
  if (termError) {
    throwMutationError(termError);
  }
  if (existingError) {
    throwMutationError(existingError);
  }
  if (!year) {
    throw new Error('Academic year not found.');
  }
  if (!term) {
    throw new Error('Term not found.');
  }

  let sequenceTermId: string | null = null;
  let sequenceAcademicYearId: string | null = null;
  const sequenceId = values.sequenceId?.trim() || '';
  if (sequenceId) {
    const { data: sequence, error: sequenceError } = await supabase
      .from('AcademicSequence')
      .select('id, termId, academicYearId')
      .eq('id', sequenceId)
      .eq('tenantId', tenantId)
      .maybeSingle();
    if (sequenceError) {
      throwMutationError(sequenceError);
    }
    if (!sequence) {
      throw new Error('Sequence not found.');
    }
    sequenceTermId = sequence.termId as string;
    sequenceAcademicYearId = sequence.academicYearId as string;
  }

  assertExamSessionPlacement({
    academicYearId: values.academicYearId,
    termId: values.termId,
    termAcademicYearId: term.academicYearId as string,
    type: values.type,
    sequenceId: sequenceId || null,
    sequenceTermId,
    sequenceAcademicYearId,
  });

  const period = skipExamPeriodDates
    ? { opensOn: null, closesOn: null }
    : await loadExamPeriodBoundsForYear(supabase, tenantId, values.academicYearId);

  assertExamSessionDates({
    startsOn: values.startsOn,
    endsOn: values.endsOn,
    yearStartsOn: year.startsOn as string,
    yearEndsOn: year.endsOn as string,
    examPeriodOpensOn: period.opensOn,
    examPeriodClosesOn: period.closesOn,
  });

  assertExamSessionUnique({
    candidate: {
      id: ignoreId ?? 'new',
      type: values.type,
      academicYearId: values.academicYearId,
      subjectId: values.subjectId,
      sequenceId: sequenceId || null,
    },
    existing: (existing ?? []) as ExamSessionDuplicateRow[],
    ignoreId,
  });

  if (ignoreId) {
    const { data: current, error: currentError } = await supabase
      .from('ExamSession')
      .select('id, subjectId, termId, sequenceId, type, finalizedAt')
      .eq('tenantId', tenantId)
      .eq('id', ignoreId)
      .maybeSingle();
    if (currentError) {
      throwMutationError(currentError);
    }
    if (!current) {
      throw new Error('Exam session not found.');
    }

    const { count, error: markError } = await supabase
      .from('SubjectMark')
      .select('*', { count: 'exact', head: true })
      .eq('tenantId', tenantId)
      .eq('examSessionId', ignoreId);
    if (markError) {
      throwMutationError(markError);
    }

    assertExamSessionUpdateAllowed({
      finalizedAt: (current.finalizedAt as string | null) ?? null,
      markCount: count ?? 0,
      current: {
        subjectId: current.subjectId as string,
        termId: current.termId as string,
        sequenceId: (current.sequenceId as string | null) ?? null,
        type: current.type as string,
      },
      next: {
        subjectId: values.subjectId,
        termId: values.termId,
        sequenceId: sequenceId || null,
        type: values.type,
      },
    });
  }
}

export function isExamSessionUniqueViolation(error: unknown): boolean {
  if (error === null || typeof error !== 'object' || !('code' in error)) {
    return false;
  }
  if ((error as { code?: string }).code !== '23505') {
    return false;
  }
  const message =
    'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : '';
  return (
    message.includes('ExamSession_normal_sequence_uidx') ||
    message.includes('ExamSession_resit_sequence_uidx') ||
    message.includes('ExamSession_major_type_uidx')
  );
}
