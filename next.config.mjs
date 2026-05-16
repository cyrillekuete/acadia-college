import nextEnv from '@next/env';
import {
  resolveSupabaseKey,
  resolveSupabaseUrl,
} from './lib/supabase/project.ts';

const { loadEnvConfig } = nextEnv;

// Last-resort dev defaults when env files are missing (publishable key is client-public).
// Prefer NEXT_PUBLIC_* in .env.local / .env.development / platform env.
const FALLBACK_SUPABASE_URL = 'https://mjjulujygiibfndtapud.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_87O3SVDsaqTc0whwjoYvNg_opwwdNwW';

loadEnvConfig(process.cwd());

/** @type {import('next').NextConfig} */
// basePath must start with / (path only); assetPrefix can be full URL
const basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH || '';
let basePath = basePathEnv;
if (basePathEnv.startsWith('http')) {
  try { basePath = new URL(basePathEnv).pathname.replace(/\/$/, ''); } catch { basePath = ''; }
}

const supabaseUrl =
  resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  FALLBACK_SUPABASE_URL;
const supabaseKey =
  resolveSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

const nextConfig = {
  basePath: basePath || '',
  assetPrefix: basePathEnv || '',
  images: {},
  output: 'standalone',
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseKey,
  },
};

export default nextConfig;
