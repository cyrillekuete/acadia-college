import { NextRequest, NextResponse } from 'next/server';
import { loadAuthorizedReportCard } from '@/lib/acadia/load-report-card';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const { searchParams } = request.nextUrl;
  const result = await loadAuthorizedReportCard({
    studentId,
    term: searchParams.get('term'),
    classId: searchParams.get('classId'),
    academicYearId: searchParams.get('academicYearId'),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data });
}
