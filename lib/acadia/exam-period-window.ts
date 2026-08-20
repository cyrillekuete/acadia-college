import type { SupabaseClient } from '@supabase/supabase-js';
import {
  checkExamPeriodWindow,
  resolveExamPeriodWindow,
  type CalendarWindowResult,
} from '@/lib/acadia/calendar-milestones';
import type { CalendarMilestoneKind } from '@/lib/acadia/calendar-schemas';

export async function fetchExamPeriodWindowForYear(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
): Promise<CalendarWindowResult> {
  const { data: milestones, error } = await supabase
    .from('AcademicCalendarMilestone')
    .select('kind, onDate, termId')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId);
  if (error) {
    throw error;
  }

  const rows = (milestones ?? []).map((row) => ({
    kind: row.kind as CalendarMilestoneKind,
    onDate: row.onDate as string,
    termId: (row.termId as string | null) ?? null,
  }));

  return checkExamPeriodWindow(rows);
}

export async function loadExamPeriodBoundsForYear(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
): Promise<{ opensOn: string | null; closesOn: string | null }> {
  const { data: milestones, error } = await supabase
    .from('AcademicCalendarMilestone')
    .select('kind, onDate, termId')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId);
  if (error) {
    throw error;
  }

  return resolveExamPeriodWindow(
    (milestones ?? []).map((row) => ({
      kind: row.kind as CalendarMilestoneKind,
      onDate: row.onDate as string,
      termId: (row.termId as string | null) ?? null,
    })),
  );
}
