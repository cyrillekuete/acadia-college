import type { SupabaseClient } from '@supabase/supabase-js';
import { throwMutationError } from '@/lib/acadia/query-errors';
import {
  buildExamSessionDeleteBlockedMessage,
  hasExamSessionDeleteBlockers,
  type ExamSessionDeleteBlockers,
} from '@/lib/acadia/exam-session-guards';

type Client = SupabaseClient;

export async function fetchExamSessionDeleteBlockers(
  supabase: Client,
  tenantId: string,
  examSessionId: string,
): Promise<ExamSessionDeleteBlockers> {
  const { data: session, error: sessionError } = await supabase
    .from('ExamSession')
    .select('id, finalizedAt')
    .eq('tenantId', tenantId)
    .eq('id', examSessionId)
    .maybeSingle();
  if (sessionError) {
    throwMutationError(sessionError);
  }
  if (!session) {
    throw new Error('Exam session not found.');
  }

  const { count, error: markError } = await supabase
    .from('SubjectMark')
    .select('*', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .eq('examSessionId', examSessionId);
  if (markError) {
    throwMutationError(markError);
  }

  return {
    marks: count ?? 0,
    finalized: Boolean(session.finalizedAt),
  };
}

export function assertExamSessionDeletable(blockers: ExamSessionDeleteBlockers): void {
  if (hasExamSessionDeleteBlockers(blockers)) {
    throw new Error(buildExamSessionDeleteBlockedMessage(blockers));
  }
}
