/**
 * Lightweight reachability check for Supabase Auth (browser or server).
 *
 * The `supabaseKey` (anon / publishable key) is required by Supabase's Kong
 * gateway on every request — including the health endpoint — otherwise the
 * gateway returns 401 before the request even reaches the auth service.
 */
export async function checkSupabaseAuthReachable(
  supabaseUrl: string,
  supabaseKey?: string,
  timeoutMs = 8000,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const base = supabaseUrl.replace(/\/$/, '');
  const healthUrl = `${base}/auth/v1/health`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {};
  if (supabaseKey) {
    headers['apikey'] = supabaseKey;
  }

  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      headers,
    });

    if (!res.ok) {
      return {
        ok: false,
        reason: `Supabase auth returned HTTP ${res.status}. Check project status in the dashboard.`,
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();

    if (lower.includes('abort')) {
      return {
        ok: false,
        reason:
          'Could not reach Supabase (timed out). Check your network or VPN, or verify the project URL in .env.local.',
      };
    }

    if (
      lower.includes('failed to fetch') ||
      lower.includes('network') ||
      lower.includes('enotfound') ||
      lower.includes('getaddrinfo')
    ) {
      return {
        ok: false,
        reason:
          'Could not reach Supabase. Confirm NEXT_PUBLIC_SUPABASE_URL matches your project ref in the Supabase dashboard (Settings → API) and that the project is not paused.',
      };
    }

    return {
      ok: false,
      reason: `Could not reach Supabase: ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
