import type { Browser, LaunchOptions, PuppeteerNode } from 'puppeteer-core';

const DEFAULT_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
] as const;

function resolveChromiumLaunchArgs(chromium: unknown): string[] {
  const chromiumRecord = chromium as Record<string, unknown>;
  const directArgs = chromiumRecord.args;
  if (Array.isArray(directArgs)) {
    return directArgs.filter((arg): arg is string => typeof arg === 'string');
  }

  const defaultArgs = chromiumRecord.defaultArgs;
  if (Array.isArray(defaultArgs)) {
    return defaultArgs.filter((arg): arg is string => typeof arg === 'string');
  }
  if (typeof defaultArgs === 'function') {
    const fromFn = (defaultArgs as () => unknown)();
    if (Array.isArray(fromFn)) {
      return fromFn.filter((arg): arg is string => typeof arg === 'string');
    }
  }
  return [];
}

async function getPuppeteerLaunchConfig(): Promise<{
  puppeteer: PuppeteerNode;
  launchOptions: LaunchOptions;
}> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || undefined;
  const isVercel = process.env.VERCEL === '1';

  if (executablePath || isVercel) {
    const [{ default: puppeteer }, { default: chromium }] = await Promise.all([
      import('puppeteer-core'),
      import('@sparticuz/chromium'),
    ]);
    const chromiumArgs = resolveChromiumLaunchArgs(chromium);
    const resolvedExecutablePath = executablePath || (await chromium.executablePath());
    return {
      puppeteer,
      launchOptions: {
        headless: true,
        executablePath: resolvedExecutablePath,
        args: [...chromiumArgs, ...DEFAULT_LAUNCH_ARGS],
      },
    };
  }

  const { default: puppeteer } = await import('puppeteer');
  return {
    puppeteer: puppeteer as unknown as PuppeteerNode,
    launchOptions: {
      headless: true,
      args: [...DEFAULT_LAUNCH_ARGS],
    },
  };
}

function parseCookieHeader(cookieHeader: string): Array<{ name: string; value: string }> {
  if (!cookieHeader.trim()) return [];
  const out: Array<{ name: string; value: string }> = [];
  for (const segment of cookieHeader.split(';')) {
    const part = segment.trim();
    if (!part) continue;
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const name = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    if (!name || !value) continue;
    out.push({ name, value });
  }
  return out;
}

export async function generateReportCardPdfFromUrl(options: {
  targetUrl: string;
  cookieHeader: string;
}): Promise<Buffer> {
  const { puppeteer, launchOptions } = await getPuppeteerLaunchConfig();

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });
    page.setDefaultNavigationTimeout(90_000);
    page.setDefaultTimeout(100_000);

    const cookies = parseCookieHeader(options.cookieHeader);
    if (cookies.length > 0) {
      await page.setCookie(
        ...cookies.map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
          url: options.targetUrl,
        })),
      );
    }

    await page.setExtraHTTPHeaders({
      Cookie: options.cookieHeader,
    });

    for (let i = 0; i < 3; i++) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    await page.goto(options.targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });

    await new Promise((r) => setTimeout(r, 300));

    await page.waitForFunction(
      () =>
        document.querySelector('[data-pdf-ready="true"]') !== null ||
        document.querySelector('#report-card-pdf-error') !== null,
      { timeout: 100_000, polling: 100 },
    );

    const errorEl = await page.$('#report-card-pdf-error');
    if (errorEl) {
      const message = await errorEl.evaluate(
        (el) => el.textContent?.trim() || 'Report card render failed',
      );
      throw new Error(message);
    }

    const pdfResult = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.isBuffer(pdfResult) ? pdfResult : Buffer.from(pdfResult);
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
