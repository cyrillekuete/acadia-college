import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { throwMutationError } from '@/lib/acadia/query-errors';

type Client = SupabaseClient<Database>;

export type TermDeleteBlockers = {
  sequences: number;
  examSessions: number;
  finalizedSessions: number;
  marks: number;
  milestones: number;
  subjectOfferings: number;
  transcripts: number;
};

async function countEq(
  supabase: Client,
  table:
    | 'AcademicSequence'
    | 'ExamSession'
    | 'AcademicCalendarMilestone'
    | 'SubjectStreamOffering'
    | 'Transcript',
  tenantId: string,
  column: string,
  value: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .eq(column, value);
  if (error) {
    throwMutationError(error);
  }
  return count ?? 0;
}

export async function fetchTermDeleteBlockers(
  supabase: Client,
  tenantId: string,
  termId: string,
): Promise<TermDeleteBlockers> {
  const { data: sessions, error: sessionError } = await supabase
    .from('ExamSession')
    .select('id, finalizedAt')
    .eq('tenantId', tenantId)
    .eq('termId', termId);
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

  const [sequences, examSessions, milestones, subjectOfferings, transcripts] =
    await Promise.all([
      countEq(supabase, 'AcademicSequence', tenantId, 'termId', termId),
      countEq(supabase, 'ExamSession', tenantId, 'termId', termId),
      countEq(supabase, 'AcademicCalendarMilestone', tenantId, 'termId', termId),
      countEq(supabase, 'SubjectStreamOffering', tenantId, 'termId', termId),
      countEq(supabase, 'Transcript', tenantId, 'termId', termId),
    ]);

  return {
    sequences,
    examSessions,
    finalizedSessions: (sessions ?? []).filter((row) => row.finalizedAt).length,
    marks,
    milestones,
    subjectOfferings,
    transcripts,
  };
}

export function hasTermDeleteBlockers(blockers: TermDeleteBlockers): boolean {
  return (
    blockers.sequences > 0 ||
    blockers.examSessions > 0 ||
    blockers.milestones > 0 ||
    blockers.subjectOfferings > 0 ||
    blockers.transcripts > 0 ||
    blockers.marks > 0
  );
}

export function termHasMarksLock(blockers: TermDeleteBlockers): boolean {
  return blockers.marks > 0 || blockers.finalizedSessions > 0;
}

export function formatTermDeleteBlockers(blockers: TermDeleteBlockers): string[] {
  const lines: string[] = [];
  if (blockers.sequences > 0) {
    lines.push(`${blockers.sequences} sequence(s)`);
  }
  if (blockers.examSessions > 0) {
    lines.push(`${blockers.examSessions} exam session(s)`);
  }
  if (blockers.finalizedSessions > 0) {
    lines.push(`${blockers.finalizedSessions} finalized exam session(s)`);
  }
  if (blockers.marks > 0) {
    lines.push(`${blockers.marks} mark(s)`);
  }
  if (blockers.milestones > 0) {
    lines.push(`${blockers.milestones} calendar milestone(s)`);
  }
  if (blockers.subjectOfferings > 0) {
    lines.push(`${blockers.subjectOfferings} subject offering(s)`);
  }
  if (blockers.transcripts > 0) {
    lines.push(`${blockers.transcripts} transcript(s)`);
  }
  return lines;
}

export function buildTermDeleteBlockedMessage(blockers: TermDeleteBlockers): string {
  const lines = formatTermDeleteBlockers(blockers);
  if (lines.length === 0) {
    return 'This term cannot be deleted because other records still reference it.';
  }
  return `This term cannot be deleted until these are removed:\n• ${lines.join('\n• ')}`;
}
