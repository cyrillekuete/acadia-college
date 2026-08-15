import { NextRequest, NextResponse } from 'next/server';
import { loadAuthorizedClassReport } from '@/lib/acadia/load-class-report';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await loadAuthorizedClassReport({
    classId: searchParams.get('classId') ?? '',
    academicYearId: searchParams.get('academicYearId'),
    period: searchParams.get('period'),
    sequenceNumber: searchParams.get('sequenceNumber'),
    term: searchParams.get('term'),
    topN: searchParams.get('topN'),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data });
}
