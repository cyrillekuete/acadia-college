import { Suspense } from 'react';
import { loadAuthorizedClassReport } from '@/lib/acadia/load-class-report';
import ClassReportPdfClient from './class-report-pdf-client';

async function ClassReportPdfPageInner({
  searchParams,
}: {
  searchParams: Promise<{
    classId?: string;
    academicYearId?: string;
    period?: string;
    sequenceNumber?: string;
    term?: string;
    topN?: string;
  }>;
}) {
  const sp = await searchParams;
  const classId = (sp.classId ?? '').trim();

  if (!classId) {
    return <ClassReportPdfClient classId="" initialError="Missing classId" />;
  }

  const result = await loadAuthorizedClassReport({
    classId,
    academicYearId: sp.academicYearId,
    period: sp.period,
    sequenceNumber: sp.sequenceNumber,
    term: sp.term,
    topN: sp.topN,
  });

  if (!result.ok) {
    return <ClassReportPdfClient classId={classId} initialError={result.error} />;
  }

  return <ClassReportPdfClient classId={classId} initialData={result.data} />;
}

export default function ClassReportPdfPage({
  searchParams,
}: {
  searchParams: Promise<{
    classId?: string;
    academicYearId?: string;
    period?: string;
    sequenceNumber?: string;
    term?: string;
    topN?: string;
  }>;
}) {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Loading class report…</div>}>
      <ClassReportPdfPageInner searchParams={searchParams} />
    </Suspense>
  );
}
