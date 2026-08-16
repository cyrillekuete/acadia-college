import { NextRequest, NextResponse } from 'next/server';
import { generateReportCardPdfFromUrl } from '@/lib/acadia/report-card-pdf';
import { sanitizeReportCardFilenamePart } from '@/lib/acadia/report-card-grading';
import { parseReportCardTerm } from '@/lib/acadia/report-card-types';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { canAccessStudentReportCard } from '@/lib/acadia/report-card-access';
import { fetchCurrentAcademicYear } from '@/lib/supabase/queries/academic-year';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 120;

function isLoopbackHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.startsWith('localhost:') ||
    h === 'localhost' ||
    h.startsWith('127.0.0.1:') ||
    h === '127.0.0.1' ||
    h.startsWith('[::1]:') ||
    h === '[::1]'
  );
}

function normalizeLoopbackHostForHeadless(host: string): string {
  const localMatch = /^localhost(:\d+)?$/i.exec(host);
  if (localMatch) return `127.0.0.1${localMatch[1] ?? ''}`;
  const v6Match = /^\[::1\](:\d+)?$/i.exec(host);
  if (v6Match) return `127.0.0.1${v6Match[1] ?? ''}`;
  return host;
}

function buildOrigin(request: NextRequest): string {
  const hostRaw = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const fromUrl = request.nextUrl.protocol.replace(':', '');
  let proto = forwardedProto || fromUrl || 'http';

  let host = hostRaw;
  if (host) {
    if (process.env.NODE_ENV === 'development' && isLoopbackHost(host)) {
      proto = 'http';
      host = normalizeLoopbackHostForHeadless(host);
    }
    return `${proto}://${host}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (envUrl) return envUrl;
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSessionApi();
    if (!session.ok) {
      return NextResponse.json({ error: session.message }, { status: session.status });
    }

    const studentId = request.nextUrl.searchParams.get('studentId')?.trim();
    const term = parseReportCardTerm(request.nextUrl.searchParams.get('term'));
    const classId = request.nextUrl.searchParams.get('classId')?.trim() || '';
    let academicYearId = request.nextUrl.searchParams.get('academicYearId')?.trim() || '';

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    const supabase = await createClient();
    if (!academicYearId) {
      const current = await fetchCurrentAcademicYear(supabase, session.ctx.tenantId);
      academicYearId = current?.id ?? '';
    }

    const allowed = await canAccessStudentReportCard(supabase, session.ctx, studentId, {
      academicYearId,
      classId,
    });
    if (!allowed) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const cookieHeader = request.headers.get('cookie') || '';
    const origin = buildOrigin(request);
    const pdfPage = new URL('/pdf/report-card', origin);
    pdfPage.searchParams.set('studentId', studentId);
    pdfPage.searchParams.set('term', term);
    if (classId) pdfPage.searchParams.set('classId', classId);
    if (academicYearId) pdfPage.searchParams.set('academicYearId', academicYearId);

    const pdfBuffer = await generateReportCardPdfFromUrl({
      targetUrl: pdfPage.toString(),
      cookieHeader,
    });

    const filename = `ReportCard_${sanitizeReportCardFilenamePart(studentId)}_${term}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'PDF generation failed';
    console.error('[report-cards/pdf]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
