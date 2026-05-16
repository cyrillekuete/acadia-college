/** @type {import('next').NextConfig} */
// basePath must start with / (path only); assetPrefix can be full URL
const basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH || '';
let basePath = basePathEnv;
if (basePathEnv.startsWith('http')) {
  try { basePath = new URL(basePathEnv).pathname.replace(/\/$/, ''); } catch { basePath = ''; }
}
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://gydbuqwtwolrxzrrksmx.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_87O3SVDsaqTc0whwjoYvNg_opwwdNwW';

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
