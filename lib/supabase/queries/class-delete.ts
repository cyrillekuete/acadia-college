import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { throwMutationError } from '@/lib/acadia/query-errors';

type Client = SupabaseClient<Database>;

export type ClassDeleteBlockers = {
  enrollments: number;
  promotionFrom: number;
  promotionTarget: number;
};

async function countRows(
  supabase: Client,
  table: keyof Database['public']['Tables'],
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

export async function fetchClassDeleteBlockers(
  supabase: Client,
  tenantId: string,
  classId: string,
): Promise<ClassDeleteBlockers> {
  const [enrollments, promotionFrom, promotionTarget] = await Promise.all([
    countRows(supabase, 'StudentEnrollment', tenantId, 'classId', classId),
    countRows(supabase, 'StudentPromotionDecision', tenantId, 'classId', classId),
    countRows(supabase, 'StudentPromotionDecision', tenantId, 'targetClassId', classId),
  ]);

  return {
    enrollments,
    promotionFrom,
    promotionTarget,
  };
}

export function hasClassDeleteBlockers(blockers: ClassDeleteBlockers): boolean {
  return blockers.enrollments > 0 || blockers.promotionFrom > 0;
}

export function formatClassDeleteBlockers(blockers: ClassDeleteBlockers): string[] {
  const lines: string[] = [];
  if (blockers.enrollments > 0) {
    lines.push(`${blockers.enrollments} student enrollment(s)`);
  }
  if (blockers.promotionFrom > 0) {
    lines.push(`${blockers.promotionFrom} promotion decision(s) for this class`);
  }
  if (blockers.promotionTarget > 0) {
    lines.push(
      `${blockers.promotionTarget} promotion decision(s) targeting this class (will be cleared on delete)`,
    );
  }
  return lines;
}

export function buildClassDeleteBlockedMessage(blockers: ClassDeleteBlockers): string {
  const lines = formatClassDeleteBlockers(blockers).filter((line) =>
    !line.includes('will be cleared on delete'),
  );
  if (lines.length === 0) {
    return 'This class cannot be deleted because other records still reference it.';
  }
  return `This class cannot be deleted until these are removed or reassigned:\n• ${lines.join('\n• ')}`;
}
