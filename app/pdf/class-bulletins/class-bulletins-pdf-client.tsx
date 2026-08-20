'use client';

import { useState } from 'react';
import { ReportCardView } from '@/components/acadia/report-cards/report-card-view';
import {
  PdfDocumentReadyMarker,
  usePdfDocumentReady,
} from '@/hooks/use-pdf-document-ready';
import type { ReportCardData } from '@/lib/acadia/report-card-types';

export default function ClassBulletinsPdfClient({
  classId,
  initialData = null,
  initialError = null,
}: {
  classId: string;
  initialData?: ReportCardData[] | null;
  initialError?: string | null;
}) {
  const [data] = useState<ReportCardData[] | null>(initialData);
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
    return <div className="p-4 text-sm text-muted-foreground">Loading class bulletins…</div>;
  }

  return (
    <>
      {data.map((card, index) => (
        <div
          key={card.student.id}
          className={index < data.length - 1 ? 'break-after-page' : undefined}
        >
          <ReportCardView data={card} variant="pdfRender" />
        </div>
      ))}
      <PdfDocumentReadyMarker ready={ready} />
    </>
  );
}
