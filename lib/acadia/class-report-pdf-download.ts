import {
  buildClassReportPdfFilename,
  type ClassReportPeriod,
} from '@/lib/acadia/class-report';

export { buildClassReportPdfFilename };

export function classReportQueryString(options: {
  classId: string;
  academicYearId?: string;
  period: ClassReportPeriod;
  topN?: number;
}): string {
  const qs = new URLSearchParams({
    classId: options.classId,
    period: options.period.kind,
  });
  if (options.academicYearId) {
    qs.set('academicYearId', options.academicYearId);
  }
  if (options.period.kind === 'sequence') {
    qs.set('sequenceNumber', String(options.period.sequenceNumber));
  }
  if (options.period.kind === 'term') {
    qs.set('term', options.period.term);
  }
  if (options.topN) {
    qs.set('topN', String(options.topN));
  }
  return qs.toString();
}

export async function fetchClassReportPdfBlob(options: {
  classId: string;
  academicYearId?: string;
  period: ClassReportPeriod;
  topN?: number;
  signal?: AbortSignal;
}): Promise<Blob> {
  const qs = classReportQueryString(options);
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  let res: Response;
  try {
    res = await fetch(`${base}/api/acadia/class-reports/pdf?${qs}`, {
      credentials: 'include',
      cache: 'no-store',
      signal: options.signal,
    });
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        'Could not download the PDF (connection failed). Try again. If this persists in dev, check the terminal for Puppeteer errors.',
      );
    }
    throw e;
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Your session has expired. Please log in again to download the class report.');
    }
    let detail = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (typeof j?.error === 'string') detail = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  return res.blob();
}
