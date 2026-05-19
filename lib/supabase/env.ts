import {
  resolveSupabaseKey,
  resolveSupabaseUrl,
} from '@/lib/supabase/project';
import { getSupabaseProjectRefMismatchMessage } from '@/lib/supabase/project-ref';

export const SUPABASE_CONFIG_ERROR =
  'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.';

export type SupabaseEnv = {
  url: string;
  key: string;
};

function getResolvedSupabaseEnv(): SupabaseEnv {
  return {
    url: resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    key: resolveSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  };
}

export function getSupabaseEnv(): SupabaseEnv {
  const env = getResolvedSupabaseEnv();

  if (!env.url || !env.key) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  return env;
}

/** Returns null when env vars are missing (e.g. proxy passthrough). */
export function getSupabaseEnvOrNull(): SupabaseEnv | null {
  const env = getResolvedSupabaseEnv();

  if (!env.url || !env.key) {
    return null;
  }

  return env;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnvOrNull() !== null;
}

/** Dev helper: returns a message when API URL and DATABASE_URL point at different projects. */
export function getConfiguredSupabaseProjectMismatch(): string | null {
  const env = getSupabaseEnvOrNull();
  if (!env) {
    return null;
  }

  return getSupabaseProjectRefMismatchMessage(
    env.url,
    process.env.DATABASE_URL,
  );
}
