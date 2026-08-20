export const PDF_IMAGE_READY_TIMEOUT_MS = 3_000;

type PdfReadyImage = {
  complete: boolean;
  addEventListener: (
    type: 'load' | 'error',
    listener: () => void,
    options?: { once?: boolean },
  ) => void;
};

/**
 * Wait for in-document images (tenant logos) so Puppeteer does not capture
 * empty placeholders. Errors and a short timeout still resolve so export
 * cannot hang on a broken remote asset.
 */
export function waitForDocumentImages(
  images: ArrayLike<PdfReadyImage> = typeof document !== 'undefined' ? document.images : [],
  timeoutMs = PDF_IMAGE_READY_TIMEOUT_MS,
): Promise<void> {
  const pending = Array.from(images).filter((image) => !image.complete);
  if (pending.length === 0) {
    return Promise.resolve();
  }

  return Promise.race([
    Promise.all(
      pending.map(
        (image) =>
          new Promise<void>((resolve) => {
            const done = () => resolve();
            image.addEventListener('load', done, { once: true });
            image.addEventListener('error', done, { once: true });
          }),
      ),
    ).then(() => undefined),
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}

/**
 * Wait until images, fonts, and the next two layout frames have settled
 * before the headless PDF client may emit `data-pdf-ready`.
 */
export async function waitForPdfLayoutReady(): Promise<void> {
  await Promise.race([
    (async () => {
      await waitForDocumentImages();
      await Promise.race([
        document.fonts.ready,
        new Promise<void>((resolve) => {
          setTimeout(resolve, 5000);
        }),
      ]);
      await Promise.race([
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
        new Promise<void>((resolve) => {
          setTimeout(resolve, 2000);
        }),
      ]);
      await new Promise((resolve) => {
        setTimeout(resolve, 400);
      });
    })(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 15_000);
    }),
  ]);
}
