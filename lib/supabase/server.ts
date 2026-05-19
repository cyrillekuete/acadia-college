import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseEnv, getSupabaseEnvOrNull } from '@/lib/supabase/env';

async function createServerClientFromEnv(
  url: string,
  key: string,
): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
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
