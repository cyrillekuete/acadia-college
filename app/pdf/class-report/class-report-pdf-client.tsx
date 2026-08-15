'use client';

import { useEffect, useState } from 'react';
import { ClassReportDocument } from '@/components/acadia/report-cards/class-report-document';
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (error) {
      setReady(true);
      return;
    }
    if (!data) return;

    let cancelled = false;
    const run = async () => {
      try {
        await Promise.race([
          (async () => {
            await Promise.race([
              document.fonts.ready,
              new Promise<void>((r) => setTimeout(r, 5000)),
            ]);
            await Promise.race([
              new Promise<void>((r) =>
                requestAnimationFrame(() => requestAnimationFrame(() => r())),
              ),
              new Promise<void>((r) => setTimeout(r, 2000)),
            ]);
            await new Promise((r) => setTimeout(r, 400));
          })(),
          new Promise<void>((r) => setTimeout(r, 15_000)),
        ]);
      } catch {
        /* ignore */
      }
      if (!cancelled) setReady(true);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [classId, data, error]);

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
      {ready && !error ? (
        <div
          id="report-card-pdf-ready"
          data-pdf-ready="true"
          aria-hidden
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        />
      ) : null}
    </>
  );
}
