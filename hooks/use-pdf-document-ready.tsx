'use client';

import { useEffect, useState } from 'react';
import { waitForPdfLayoutReady } from '@/lib/acadia/report-card-pdf-ready';

export function usePdfDocumentReady(enabled: boolean): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        await waitForPdfLayoutReady();
      } catch {
        /* still mark ready so capture is not blocked forever */
      }
      if (!cancelled) {
        setReady(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return ready;
}

export function PdfDocumentReadyMarker({ ready }: { ready: boolean }) {
  if (!ready) {
    return null;
  }
  return (
    <div
      id="report-card-pdf-ready"
      data-pdf-ready="true"
      aria-hidden
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    />
  );
}
