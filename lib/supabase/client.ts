import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseEnv,
  getSupabaseEnvOrNull,
  SUPABASE_CONFIG_ERROR,
} from '@/lib/supabase/env';

/** Browser client, or null when Supabase env vars are missing. */
export function createClientOrNull(): SupabaseClient | null {
  const env = getSupabaseEnvOrNull();
  if (!env) {
    return null;
  }
  return createBrowserClient(env.url, env.key);
}

/** Browser client; throws {@link SUPABASE_CONFIG_ERROR} when env vars are missing. */
export function createClient(): SupabaseClient {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient(url, key);
}

/** For React Query `queryFn` — returns a client or throws a handled configuration error. */
export function requireBrowserClient(): SupabaseClient {
  const client = createClientOrNull();
  if (!client) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }
  return client;
}
