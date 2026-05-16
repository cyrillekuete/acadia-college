/** Normalize Supabase URL from env (trim, strip trailing slash). */
export function resolveSupabaseUrl(envUrl: string | undefined): string {
  const trimmed = typeof envUrl === 'string' ? envUrl.trim() : '';
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
  } catch {
    return '';
  }

  return trimmed.replace(/\/$/, '');
}

/** Normalize Supabase publishable/anon key from env (trim only). */
export function resolveSupabaseKey(envKey: string | undefined): string {
  return typeof envKey === 'string' ? envKey.trim() : '';
}
