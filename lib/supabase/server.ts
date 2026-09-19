import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseEnv, getSupabaseEnvOrNull } from '@/lib/supabase/env';
import { shouldPersistSessionCookie } from '@/lib/supabase/remember-me';

function resolveServerCookieMaxAge(
  name: string,
  value: string,
  options: { maxAge?: number },
  rememberMe: boolean,
): number | undefined {
  // Removals must stay removals so sign-out and chunk cleanup work.
  if (!value || options.maxAge === 0) {
    return 0;
  }
  if (!rememberMe) {
    // Session cookie: no Max-Age, cleared when the browser closes.
    return undefined;
  }
  return options.maxAge;
}

async function createServerClientFromEnv(
  url: string,
  key: string,
): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  // The remember-me choice rides in the request's marker cookie.
  const marker = cookieStore.get('acadia-remember-me')?.value;
  const rememberMe = shouldPersistSessionCookie(marker);

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const maxAge = resolveServerCookieMaxAge(
              name,
              value,
              options,
              rememberMe,
            );
            cookieStore.set(name, value, { ...options, maxAge });
          });
        } catch {
          // Called from Server Component — proxy handles refresh.
        }
      },
    },
  });
}

/** Server client, or null when Supabase env vars are missing. */
export async function createClientOrNull(): Promise<SupabaseClient | null> {
  const env = getSupabaseEnvOrNull();
  if (!env) {
    return null;
  }
  return createServerClientFromEnv(env.url, env.key);
}

/** Server client; throws when Supabase env vars are missing. */
export async function createClient(): Promise<SupabaseClient> {
  const { url, key } = getSupabaseEnv();
  return createServerClientFromEnv(url, key);
}
