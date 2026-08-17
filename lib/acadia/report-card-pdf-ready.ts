/**
 * Wait until fonts and the next two layout frames have settled before the
 * headless PDF client may emit `data-pdf-ready`.
 */
export async function waitForPdfLayoutReady(): Promise<void> {
  await Promise.race([
    (async () => {
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
