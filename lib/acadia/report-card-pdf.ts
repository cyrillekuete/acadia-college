import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, LaunchOptions, Page, PuppeteerNode } from 'puppeteer-core';

const DEFAULT_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
] as const;

function resolveLocalBrowserExecutable(): string | undefined {
  const candidates: string[] = [];

  if (process.platform === 'win32') {
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env.LOCALAPPDATA || '';
    candidates.push(
      join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/microsoft-edge',
    );
  }

  return candidates.find((candidate) => candidate.length > 0 && existsSync(candidate));
}

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
  const localExecutablePath = resolveLocalBrowserExecutable();
  return {
    puppeteer: puppeteer as unknown as PuppeteerNode,
    launchOptions: {
      headless: true,
      ...(localExecutablePath ? { executablePath: localExecutablePath } : {}),
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

async function applySessionCookies(
  page: Page,
  targetUrl: string,
  cookieHeader: string,
): Promise<void> {
  const cookies = parseCookieHeader(cookieHeader);
  if (cookies.length === 0) return;

  const origin = new URL(targetUrl).origin;
  await page.setCookie(
    ...cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      url: origin,
      path: '/',
    })),
  );
}

async function describePage(page: Page): Promise<string> {
  try {
    const info = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      text: (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 240),
    }));
    const text = info.text ? ` ${info.text}` : '';
    return ` Last page: ${info.url} (${info.title}).${text}`;
  } catch {
    return '';
  }
}

async function waitForPdfDocument(page: Page): Promise<void> {
  try {
    await page.waitForFunction(
      () =>
        document.querySelector('[data-pdf-ready="true"]') !== null ||
        document.querySelector('.pdf-report-card') !== null ||
        document.querySelector('#report-card-pdf-error') !== null,
      { timeout: 60_000, polling: 100 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Waiting failed') || message.includes('exceeded')) {
      throw new Error(
        `Report card PDF page did not finish rendering.${await describePage(page)}`,
      );
    }
    throw error;
  }

  const redirectedToSignIn = await page.evaluate(() => {
    const path = location.pathname;
    return path === '/signin' || path.startsWith('/signin/');
  });
  if (redirectedToSignIn) {
    throw new Error(
      'Authentication required to generate the PDF. Sign in again and retry.',
    );
  }

  await page.evaluate(
    () =>
      Promise.race([
        document.fonts.ready.then(() => undefined),
        new Promise<void>((resolve) => {
          setTimeout(resolve, 3000);
        }),
      ]),
  );
  await new Promise((resolve) => setTimeout(resolve, 200));
}

export async function generateReportCardPdfFromUrl(options: {
  targetUrl: string;
  cookieHeader: string;
}): Promise<Buffer> {
  const { puppeteer, launchOptions } = await getPuppeteerLaunchConfig();

  let browser: Browser | null = null;
  try {
    try {
      browser = await puppeteer.launch(launchOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Could not find Chrome') || message.includes('Could not find browser')) {
        throw new Error(
          'PDF generation needs Google Chrome or Microsoft Edge installed. Install one of those browsers, or set PUPPETEER_EXECUTABLE_PATH to a Chromium binary.',
        );
      }
      throw error;
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });
    page.setDefaultNavigationTimeout(90_000);
    page.setDefaultTimeout(60_000);

    await applySessionCookies(page, options.targetUrl, options.cookieHeader);

    await page.goto(options.targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });

    await waitForPdfDocument(page);

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
