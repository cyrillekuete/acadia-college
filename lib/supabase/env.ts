export const SUPABASE_CONFIG_ERROR =
  'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.';

export type SupabaseEnv = {
  url: string;
  key: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

  if (!url || !key) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  return { url, key };
}

/** Returns null when env vars are missing (e.g. middleware passthrough). */
export function getSupabaseEnvOrNull(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnvOrNull() !== null;
}
