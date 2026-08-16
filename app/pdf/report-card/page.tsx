import { Suspense } from 'react';
import { parseReportCardTerm } from '@/lib/acadia/report-card-types';
import { loadAuthorizedReportCard } from '@/lib/acadia/load-report-card';
import ReportCardPdfClient from './report-card-pdf-client';

async function ReportCardPdfPageInner({
  searchParams,
}: {
  searchParams: Promise<{
    studentId?: string;
    term?: string;
    classId?: string;
    academicYearId?: string;
  }>;
}) {
  const sp = await searchParams;
  const studentId = (sp.studentId ?? '').trim();
  const term = parseReportCardTerm(sp.term);

  if (!studentId) {
    return (
      <ReportCardPdfClient studentId="" term={term} initialError="Missing studentId" />
    );
  }

  const result = await loadAuthorizedReportCard({
    studentId,
    term,
    classId: sp.classId,
    academicYearId: sp.academicYearId,
  });

  if (!result.ok) {
    return (
      <ReportCardPdfClient studentId={studentId} term={term} initialError={result.error} />
    );
  }

  return (
    <ReportCardPdfClient studentId={studentId} term={term} initialData={result.data} />
  );
}

export default function ReportCardPdfPage({
  searchParams,
}: {
  searchParams: Promise<{
    studentId?: string;
    term?: string;
    classId?: string;
    academicYearId?: string;
  }>;
}) {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Loading report card…</div>}>
      <ReportCardPdfPageInner searchParams={searchParams} />
    </Suspense>
  );
}
