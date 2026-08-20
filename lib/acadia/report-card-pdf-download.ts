import { buildReportCardPdfFilename } from '@/lib/acadia/report-card-grading';

export { buildReportCardPdfFilename };

export const PDF_DOWNLOAD_TIMEOUT_MS = 180_000;
export const PDF_DOWNLOAD_TIMEOUT_MESSAGE = 'PDF generation timed out, try again';

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

export function withPdfDownloadTimeout(
  external?: AbortSignal,
  timeoutMs = PDF_DOWNLOAD_TIMEOUT_MS,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  external?.addEventListener('abort', onAbort);
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', onAbort);
    },
  };
}

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
  const { signal, cleanup } = withPdfDownloadTimeout(options.signal);
  let res: Response;
  try {
    res = await fetch(`${base}/api/acadia/report-cards/pdf?${qs.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
      signal,
    });
  } catch (e) {
    if (isAbortError(e)) {
      if (options.signal?.aborted) throw e;
      throw new Error(PDF_DOWNLOAD_TIMEOUT_MESSAGE);
    }
    if (e instanceof TypeError) {
      throw new Error(
        'Could not download the PDF (connection failed). Try again. If this persists in dev, check the terminal for Puppeteer errors.',
      );
    }
    throw e;
  } finally {
    cleanup();
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

export async function fetchClassBulletinsPdfBlob(options: {
  classId: string;
  term: string;
  academicYearId?: string;
  includeWithdrawn?: boolean;
  signal?: AbortSignal;
}): Promise<Blob> {
  const qs = new URLSearchParams({
    classId: options.classId,
    term: options.term,
  });
  if (options.academicYearId) qs.set('academicYearId', options.academicYearId);
  if (options.includeWithdrawn) qs.set('includeWithdrawn', '1');

  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  const { signal, cleanup } = withPdfDownloadTimeout(options.signal);
  let res: Response;
  try {
    res = await fetch(`${base}/api/acadia/report-cards/class-pdf?${qs.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
      signal,
    });
  } catch (e) {
    if (isAbortError(e)) {
      if (options.signal?.aborted) throw e;
      throw new Error(PDF_DOWNLOAD_TIMEOUT_MESSAGE);
    }
    if (e instanceof TypeError) {
      throw new Error(
        'Could not download the PDF (connection failed). Try again. If this persists in dev, check the terminal for Puppeteer errors.',
      );
    }
    throw e;
  } finally {
    cleanup();
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
