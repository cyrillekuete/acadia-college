'use client';

import { useState } from 'react';
import { ClassReportDocument } from '@/components/acadia/report-cards/class-report-document';
import {
  PdfDocumentReadyMarker,
  usePdfDocumentReady,
} from '@/hooks/use-pdf-document-ready';
import type { ClassReportData } from '@/lib/acadia/class-report';

export default function ClassReportPdfClient({
  classId,
  initialData = null,
  initialError = null,
}: {
  classId: string;
  initialData?: ClassReportData | null;
  initialError?: string | null;
}) {
  const [data] = useState<ClassReportData | null>(initialData);
  const [error] = useState<string | null>(initialError);
  const ready = usePdfDocumentReady(Boolean(data) && !error);

  if (!classId) {
    return (
      <div id="report-card-pdf-error" className="p-4 text-sm">
        Missing classId
      </div>
    );
  }

  if (error) {
    return (
      <div id="report-card-pdf-error" className="p-4 text-sm">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="p-4 text-sm text-muted-foreground">Loading class report…</div>;
  }

  return (
    <>
      <ClassReportDocument data={data} variant="pdfRender" />
      <PdfDocumentReadyMarker ready={ready} />
    </>
  );
}
