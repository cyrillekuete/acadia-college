import type { SupabaseClient } from '@supabase/supabase-js';
import {
  checkEnrollmentWindow,
  type CalendarWindowResult,
} from '@/lib/acadia/calendar-milestones';
import type { CalendarMilestoneKind } from '@/lib/acadia/calendar-schemas';

export async function assertEnrollmentWindowForYear(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
  options?: { override?: boolean },
): Promise<CalendarWindowResult> {
  const [{ data: year, error: yearError }, { data: milestones, error: milestoneError }] =
    await Promise.all([
      supabase
        .from('AcademicYear')
        .select('enrollmentOpensAt, enrollmentClosesAt')
        .eq('tenantId', tenantId)
        .eq('id', academicYearId)
        .maybeSingle(),
      supabase
        .from('AcademicCalendarMilestone')
        .select('kind, onDate, termId')
        .eq('tenantId', tenantId)
        .eq('academicYearId', academicYearId),
    ]);

  if (yearError) {
    throw yearError;
  }
  if (milestoneError) {
    throw milestoneError;
  }
  if (!year) {
    throw new Error('Academic year not found.');
  }

  const window = checkEnrollmentWindow(
    (milestones ?? []).map((row) => ({
      kind: row.kind as CalendarMilestoneKind,
      onDate: row.onDate as string,
      termId: (row.termId as string | null) ?? null,
    })),
    {
      enrollmentOpensAt: (year.enrollmentOpensAt as string | null) ?? null,
      enrollmentClosesAt: (year.enrollmentClosesAt as string | null) ?? null,
    },
  );

  if (!window.allowed && !options?.override) {
    throw new Error(window.message ?? 'Enrollment is closed for this academic year.');
  }

  return window;
}
