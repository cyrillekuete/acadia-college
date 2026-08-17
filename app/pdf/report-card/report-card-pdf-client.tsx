'use client';

import { useState } from 'react';
import { ReportCardView } from '@/components/acadia/report-cards/report-card-view';
import {
  PdfDocumentReadyMarker,
  usePdfDocumentReady,
} from '@/hooks/use-pdf-document-ready';
import type { ReportCardData } from '@/lib/acadia/report-card-types';

export default function ReportCardPdfClient({
  studentId,
  term,
  initialData = null,
  initialError = null,
}: {
  studentId: string;
  term: string;
  initialData?: ReportCardData | null;
  initialError?: string | null;
}) {
  const [data] = useState<ReportCardData | null>(initialData);
  const [error] = useState<string | null>(initialError);
  const ready = usePdfDocumentReady(Boolean(data) && !error);

  if (!studentId) {
    return (
      <div id="report-card-pdf-error" className="p-4 text-sm">
        Missing studentId
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
    return <div className="p-4 text-sm text-muted-foreground">Loading report card…</div>;
  }

  const termNumber: 1 | 2 | 3 =
    term === '1' ? 1 : term === '2' ? 2 : 3;
  const viewData: ReportCardData =
    term === 'annual'
      ? data
      : {
          ...data,
          academic: {
            ...data.academic,
            term: termNumber,
          },
        };

  return (
    <>
      <ReportCardView data={viewData} variant="pdfRender" />
      <PdfDocumentReadyMarker ready={ready} />
    </>
  );
}
