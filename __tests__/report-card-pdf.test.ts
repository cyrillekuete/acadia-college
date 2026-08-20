import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REPORT_CARD_PDF_STYLES } from '@/components/acadia/report-cards/report-card-pdf-styles';
import {
  CHROMIUM_PACK_VERSION,
  mapPdfGenerationError,
  PDF_NAVIGATION_TIMEOUT_MESSAGE,
  resolveChromiumPackUrl,
  resolvePdfNavigationTimeoutMs,
  warmPdfTargetUrl,
} from '@/lib/acadia/report-card-pdf';
import {
  isAbortError,
  PDF_DOWNLOAD_TIMEOUT_MESSAGE,
  PDF_DOWNLOAD_TIMEOUT_MS,
  withPdfDownloadTimeout,
} from '@/lib/acadia/report-card-pdf-download';
import {
  PDF_IMAGE_READY_TIMEOUT_MS,
  waitForDocumentImages,
} from '@/lib/acadia/report-card-pdf-ready';

describe('resolveChromiumPackUrl', () => {
  it('uses an explicit remote pack when provided', () => {
    expect(
      resolveChromiumPackUrl({
        remotePath: ' https://cdn.example.com/chromium-pack.tar ',
        arch: 'arm64',
      }),
    ).toBe('https://cdn.example.com/chromium-pack.tar');
  });

  it('pins the GitHub pack to the installed chromium-min version and CPU arch', () => {
    expect(resolveChromiumPackUrl({ arch: 'x64' })).toBe(
      `https://github.com/Sparticuz/chromium/releases/download/v${CHROMIUM_PACK_VERSION}/chromium-v${CHROMIUM_PACK_VERSION}-pack.x64.tar`,
    );
    expect(resolveChromiumPackUrl({ arch: 'arm64' })).toBe(
      `https://github.com/Sparticuz/chromium/releases/download/v${CHROMIUM_PACK_VERSION}/chromium-v${CHROMIUM_PACK_VERSION}-pack.arm64.tar`,
    );
  });
});

describe('Vercel Chromium packaging', () => {
  it('externalizes chromium-min instead of bundling a local bin directory', () => {
    const nextConfig = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8');
    const pdfSource = readFileSync(
      join(process.cwd(), 'lib/acadia/report-card-pdf.ts'),
      'utf8',
    );
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> };

    expect(nextConfig).toMatch(/@sparticuz\/chromium-min/);
    expect(nextConfig).not.toMatch(/@sparticuz\/chromium'/);
    expect(pdfSource).toMatch(/import\('@sparticuz\/chromium-min'\)/);
    expect(pdfSource).toMatch(/CHROMIUM_REMOTE_EXEC_PATH/);
    expect(packageJson.dependencies['@sparticuz/chromium-min']).toContain(
      CHROMIUM_PACK_VERSION,
    );
    expect(packageJson.dependencies['@sparticuz/chromium']).toBeUndefined();
  });
});

describe('local PDF hang safeguards', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('allows headless Chrome on 127.0.0.1 during next dev', () => {
    const nextConfig = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8');
    expect(nextConfig).toMatch(/allowedDevOrigins:\s*\[\s*'127\.0\.0\.1'\s*\]/);
  });

  it('warms the print page before Puppeteer goto', () => {
    const pdfSource = readFileSync(
      join(process.cwd(), 'lib/acadia/report-card-pdf.ts'),
      'utf8',
    );
    expect(pdfSource).toMatch(/warmPdfTargetUrl\(options\)/);
    expect(pdfSource.indexOf('warmPdfTargetUrl(options)')).toBeLessThan(
      pdfSource.indexOf('page.goto'),
    );
  });

  it('uses a longer navigation timeout in development', () => {
    expect(resolvePdfNavigationTimeoutMs('development')).toBe(180_000);
    expect(resolvePdfNavigationTimeoutMs('production')).toBe(90_000);
  });

  it('maps Puppeteer navigation timeouts to a retryable message', () => {
    const timeout = new Error('Navigation timeout of 90000 ms exceeded');
    timeout.name = 'TimeoutError';
    expect(mapPdfGenerationError(timeout).message).toBe(
      PDF_NAVIGATION_TIMEOUT_MESSAGE,
    );
    expect(mapPdfGenerationError(new Error('Could not find Chrome')).message).toBe(
      'Could not find Chrome',
    );
  });

  it('skips the print-page warm-up outside development', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await warmPdfTargetUrl({
      targetUrl: 'http://127.0.0.1:3000/pdf/report-card',
      cookieHeader: 'sid=1',
      nodeEnv: 'production',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('warms the print page with session cookies in development', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    vi.stubGlobal('fetch', fetchMock);
    await warmPdfTargetUrl({
      targetUrl: 'http://127.0.0.1:3000/pdf/report-card?studentId=1',
      cookieHeader: 'sid=abc',
      nodeEnv: 'development',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:3000/pdf/report-card?studentId=1');
    expect(new Headers(init.headers).get('cookie')).toBe('sid=abc');
  });

  it('aborts a hung PDF download after three minutes', () => {
    vi.useFakeTimers();
    const { signal, cleanup } = withPdfDownloadTimeout(undefined, PDF_DOWNLOAD_TIMEOUT_MS);
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(PDF_DOWNLOAD_TIMEOUT_MS);
    expect(signal.aborted).toBe(true);
    cleanup();
    vi.useRealTimers();
    expect(PDF_DOWNLOAD_TIMEOUT_MESSAGE).toBe('PDF generation timed out, try again');
    expect(isAbortError(Object.assign(new Error('Aborted'), { name: 'AbortError' }))).toBe(
      true,
    );
  });
});

describe('PDF print lock', () => {
  it('declares an A4 page box and locks print/md layout utilities', () => {
    expect(REPORT_CARD_PDF_STYLES).toMatch(/@page\s*\{\s*size:\s*A4;/);
    expect(REPORT_CARD_PDF_STYLES).toMatch(/print-color-adjust:\s*exact/);
    expect(REPORT_CARD_PDF_STYLES).toMatch(/color-adjust:\s*exact/);
    expect(REPORT_CARD_PDF_STYLES).toContain('.print\\:text-\\[8pt\\]');
    expect(REPORT_CARD_PDF_STYLES).toContain('.print\\:px-3');
    expect(REPORT_CARD_PDF_STYLES).toContain('.print\\:pt-6');
    expect(REPORT_CARD_PDF_STYLES).toContain('.print\\:grid-cols-3');
    expect(REPORT_CARD_PDF_STYLES).toContain('.print\\:min-h-\\[297mm\\]');
    expect(REPORT_CARD_PDF_STYLES).toContain('.md\\:grid-cols-3');
    expect(REPORT_CARD_PDF_STYLES).toContain('.md\\:flex-row');
    expect(REPORT_CARD_PDF_STYLES).toContain('.md\\:text-left');
    expect(REPORT_CARD_PDF_STYLES).toContain('.md\\:block');
    expect(REPORT_CARD_PDF_STYLES).toContain('.md\\:items-stretch');
  });
});

describe('Puppeteer capture contract', () => {
  const pdfSource = readFileSync(
    join(process.cwd(), 'lib/acadia/report-card-pdf.ts'),
    'utf8',
  );

  it('waits only for the ready marker or render error', () => {
    expect(pdfSource).toMatch(/querySelector\('\[data-pdf-ready="true"\]'\)/);
    expect(pdfSource).toMatch(/querySelector\('#report-card-pdf-error'\)/);
    expect(pdfSource).not.toMatch(
      /querySelector\('\.pdf-report-card'\)\s*!==\s*null/,
    );
  });

  it('prints with CSS page size and session cookies', () => {
    expect(pdfSource).toMatch(/preferCSSPageSize:\s*true/);
    expect(pdfSource).toMatch(/emulateMediaType\('print'\)/);
    expect(pdfSource).toMatch(/setExtraHTTPHeaders/);
    expect(pdfSource).toMatch(/setImmediate/);
    expect(pdfSource).not.toMatch(/document\.fonts\.ready/);
  });
});

describe('waitForPdfLayoutReady', () => {
  it('waits for in-document images before fonts and paint', () => {
    const source = readFileSync(
      join(process.cwd(), 'lib/acadia/report-card-pdf-ready.ts'),
      'utf8',
    );
    expect(source.indexOf('await waitForDocumentImages()')).toBeGreaterThan(-1);
    expect(source.indexOf('await waitForDocumentImages()')).toBeLessThan(
      source.indexOf('document.fonts.ready'),
    );
  });
});

describe('waitForDocumentImages', () => {
  it('resolves immediately when every image is already complete', async () => {
    await expect(
      waitForDocumentImages([{ complete: true, addEventListener: vi.fn() }]),
    ).resolves.toBeUndefined();
  });

  it('resolves when pending images load or error', async () => {
    const listeners = new Map<string, () => void>();
    const image = {
      complete: false,
      addEventListener: (
        type: 'load' | 'error',
        listener: () => void,
      ) => {
        listeners.set(type, listener);
      },
    };

    const pending = waitForDocumentImages([image]);
    listeners.get('load')?.();
    await expect(pending).resolves.toBeUndefined();
  });

  it('gives up after the image timeout so a broken logo cannot hang export', async () => {
    vi.useFakeTimers();
    const pending = waitForDocumentImages(
      [{ complete: false, addEventListener: vi.fn() }],
      PDF_IMAGE_READY_TIMEOUT_MS,
    );
    vi.advanceTimersByTime(PDF_IMAGE_READY_TIMEOUT_MS);
    await expect(pending).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
