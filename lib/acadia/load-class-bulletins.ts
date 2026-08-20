import { canAccessClassReport } from '@/lib/acadia/report-card-access';
import {
  parseReportCardTerm,
  type ReportCardData,
  type ReportCardTerm,
} from '@/lib/acadia/report-card-types';
import { requireSessionApi, type SessionApiContext } from '@/lib/acadia/require-session-api';
import { createClient } from '@/lib/supabase/server';
import { fetchCurrentAcademicYear } from '@/lib/supabase/queries/academic-year';
import { loadStudentReportCard } from '@/lib/supabase/queries/report-card';
import { fetchStudentsFromEnrollmentsForClassIds } from '@/lib/supabase/queries/students-list';

export type LoadClassBulletinsResult =
  | { ok: true; data: ReportCardData[]; ctx: SessionApiContext }
  | { ok: false; status: number; error: string };

export async function loadAuthorizedClassBulletins(options: {
  classId: string;
  term?: string | null;
  academicYearId?: string | null;
  includeWithdrawn?: boolean;
}): Promise<LoadClassBulletinsResult> {
  const session = await requireSessionApi();
  if (!session.ok) {
    return { ok: false, status: session.status, error: session.message };
  }

  const classId = options.classId.trim();
  if (!classId) {
    return { ok: false, status: 400, error: 'Missing classId' };
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

  const allowed = await canAccessClassReport(supabase, session.ctx, classId, yearId);
  if (!allowed) {
    return { ok: false, status: 403, error: 'Access denied.' };
  }

  const students = await fetchStudentsFromEnrollmentsForClassIds(
    supabase,
    session.ctx.tenantId,
    yearId,
    [classId],
    { includeWithdrawn: options.includeWithdrawn === true },
  );
  const term: ReportCardTerm = parseReportCardTerm(options.term);
  const cards: ReportCardData[] = [];
  for (const student of students) {
    cards.push(
      await loadStudentReportCard(
        supabase,
        session.ctx.tenantId,
        student.id,
        yearId,
        term,
        classId,
      ),
    );
  }

  return { ok: true, data: cards, ctx: session.ctx };
}
