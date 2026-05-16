/**
 * Returns a same-origin relative path safe for redirects, or `fallback`.
 * Blocks protocol-relative URLs (`//evil.com`), absolute URLs, and backslash paths.
 */
export function getSafeRedirectPath(
  next: string | null | undefined,
  fallback = '/',
): string {
  if (!next || typeof next !== 'string') {
    return fallback;
  }

  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }

  if (
    decoded.startsWith('//') ||
    decoded.includes('://') ||
    decoded.includes('\\') ||
    decoded.includes('\0')
  ) {
    return fallback;
  }

  return trimmed;
}
