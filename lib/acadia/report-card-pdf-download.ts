import { buildReportCardPdfFilename } from '@/lib/acadia/report-card-grading';

export { buildReportCardPdfFilename };

export async function fetchReportCardPdfBlob(options: {
  studentId: string;
  term: string;
  classId?: string;
  academicYearId?: string;
  signal?: AbortSignal;
}): Promise<Blob> {
  const qs = new URLSearchParams({
    studentId: options.studentId,
    term: options.term,
  });
  if (options.classId) qs.set('classId', options.classId);
  if (options.academicYearId) qs.set('academicYearId', options.academicYearId);

  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  let res: Response;
  try {
    res = await fetch(`${base}/api/acadia/report-cards/pdf?${qs.toString()}`, {
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
      throw new Error('Your session has expired. Please log in again to download report cards.');
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

export function savePdfBlobToDownloads(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
