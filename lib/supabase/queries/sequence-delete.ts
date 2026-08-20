import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { throwMutationError } from '@/lib/acadia/query-errors';

type Client = SupabaseClient<Database>;

export type SequenceDeleteBlockers = {
  examSessions: number;
  finalizedSessions: number;
  marks: number;
};

export async function fetchSequenceDeleteBlockers(
  supabase: Client,
  tenantId: string,
  sequenceId: string,
): Promise<SequenceDeleteBlockers> {
  const { data: sessions, error: sessionError } = await supabase
    .from('ExamSession')
    .select('id, finalizedAt')
    .eq('tenantId', tenantId)
    .eq('sequenceId', sequenceId);
  if (sessionError) {
    throwMutationError(sessionError);
  }

  const sessionIds = (sessions ?? []).map((row) => row.id as string);
  let marks = 0;
  if (sessionIds.length > 0) {
    const { count, error } = await supabase
      .from('SubjectMark')
      .select('*', { count: 'exact', head: true })
      .eq('tenantId', tenantId)
      .in('examSessionId', sessionIds);
    if (error) {
      throwMutationError(error);
    }
    marks = count ?? 0;
  }

  return {
    examSessions: sessionIds.length,
    finalizedSessions: (sessions ?? []).filter((row) => row.finalizedAt).length,
    marks,
  };
}

export function hasSequenceDeleteBlockers(blockers: SequenceDeleteBlockers): boolean {
  return blockers.examSessions > 0 || blockers.marks > 0;
}

export function sequenceHasMarksLock(blockers: SequenceDeleteBlockers): boolean {
  return blockers.marks > 0 || blockers.finalizedSessions > 0;
}

export function formatSequenceDeleteBlockers(blockers: SequenceDeleteBlockers): string[] {
  const lines: string[] = [];
  if (blockers.examSessions > 0) {
    lines.push(`${blockers.examSessions} exam session(s)`);
  }
  if (blockers.finalizedSessions > 0) {
    lines.push(`${blockers.finalizedSessions} finalized exam session(s)`);
  }
  if (blockers.marks > 0) {
    lines.push(`${blockers.marks} mark(s)`);
  }
  return lines;
}

export function buildSequenceDeleteBlockedMessage(
  blockers: SequenceDeleteBlockers,
): string {
  const lines = formatSequenceDeleteBlockers(blockers);
  if (lines.length === 0) {
    return 'This sequence cannot be deleted because other records still reference it.';
  }
  return `This sequence cannot be deleted until these are removed:\n• ${lines.join('\n• ')}`;
}

export function buildSequenceLockedMessage(blockers: SequenceDeleteBlockers): string {
  return `This sequence cannot be remapped because it has ${formatSequenceDeleteBlockers(blockers).join(', ')}.`;
}
