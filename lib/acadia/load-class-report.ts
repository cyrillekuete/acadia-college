import {
  canAccessClassReport,
} from '@/lib/acadia/report-card-access';
import {
  buildClassReport,
  parseClassReportPeriod,
  parseClassReportTopN,
  type ClassReportData,
} from '@/lib/acadia/class-report';
import { requireSessionApi, type SessionApiContext } from '@/lib/acadia/require-session-api';
import { createClient } from '@/lib/supabase/server';
import { fetchCurrentAcademicYear } from '@/lib/supabase/queries/academic-year';
import { fetchClassReportBundle } from '@/lib/supabase/queries/class-report';

export type LoadClassReportResult =
  | { ok: true; data: ClassReportData; ctx: SessionApiContext }
  | { ok: false; status: number; error: string };

export async function loadAuthorizedClassReport(options: {
  classId: string;
  academicYearId?: string | null;
  period?: string | null;
  sequenceNumber?: string | null;
  term?: string | null;
  topN?: string | null;
}): Promise<LoadClassReportResult> {
  const session = await requireSessionApi();
  if (!session.ok) {
    return { ok: false, status: session.status, error: session.message };
  }

  const classId = options.classId.trim();
  if (!classId) {
    return { ok: false, status: 400, error: 'Missing classId' };
  }

  const period = parseClassReportPeriod({
    period: options.period,
    sequenceNumber: options.sequenceNumber,
    term: options.term,
  });
  if ('error' in period) {
    return { ok: false, status: 400, error: period.error };
  }

  const supabase = await createClient();
  let yearId = options.academicYearId?.trim() || '';
  if (!yearId) {
    const current = await fetchCurrentAcademicYear(supabase, session.ctx.tenantId);
    yearId = current?.id ?? '';
  }
  if (!yearId) {
    return { ok: false, status: 400, error: 'Academic year is required.' };
  }

  const allowed = await canAccessClassReport(
    supabase,
    session.ctx,
    classId,
    yearId,
  );
  if (!allowed) {
    return { ok: false, status: 403, error: 'Access denied.' };
  }

  try {
    const bundle = await fetchClassReportBundle(
      supabase,
      session.ctx.tenantId,
      classId,
      yearId,
    );
    return {
      ok: true,
      data: buildClassReport(bundle, period, {
        topN: parseClassReportTopN(options.topN),
      }),
      ctx: session.ctx,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load class report.';
    return { ok: false, status: 400, error: message };
  }
}
