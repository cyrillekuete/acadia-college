import { canAccessStudentReportCard } from '@/lib/acadia/report-card-access';
import {
  parseReportCardTerm,
  type ReportCardData,
  type ReportCardTerm,
} from '@/lib/acadia/report-card-types';
import { requireSessionApi, type SessionApiContext } from '@/lib/acadia/require-session-api';
import { createClient } from '@/lib/supabase/server';
import { fetchCurrentAcademicYear } from '@/lib/supabase/queries/academic-year';
import { loadStudentReportCard } from '@/lib/supabase/queries/report-card';

export type LoadReportCardResult =
  | { ok: true; data: ReportCardData; ctx: SessionApiContext }
  | { ok: false; status: number; error: string };

export async function loadAuthorizedReportCard(options: {
  studentId: string;
  term?: string | null;
  classId?: string | null;
  academicYearId?: string | null;
}): Promise<LoadReportCardResult> {
  const session = await requireSessionApi();
  if (!session.ok) {
    return { ok: false, status: session.status, error: session.message };
  }

  const studentId = options.studentId.trim();
  if (!studentId) {
    return { ok: false, status: 400, error: 'Missing studentId' };
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

  const allowed = await canAccessStudentReportCard(supabase, session.ctx, studentId, {
    academicYearId: yearId,
    classId: options.classId,
  });
  if (!allowed) {
    return { ok: false, status: 403, error: 'Access denied.' };
  }

  const term: ReportCardTerm = parseReportCardTerm(options.term);
  try {
    const data = await loadStudentReportCard(
      supabase,
      session.ctx.tenantId,
      studentId,
      yearId,
      term,
      options.classId,
    );
    return { ok: true, data, ctx: session.ctx };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load report card.';
    return { ok: false, status: 400, error: message };
  }
}
