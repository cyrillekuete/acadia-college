/**
 * Link local Supabase CLI to the remote Acadia College project.
 *
 * Prerequisites:
 * 1. Create a personal access token: https://supabase.com/dashboard/account/tokens
 * 2. Add to .env.local: SUPABASE_ACCESS_TOKEN=sbp_...
 * 3. Ensure DATABASE_URL or SUPABASE_DB_PASSWORD is set in .env.local
 *
 * Run: npm run supabase:link
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROJECT_REF = 'mjjulujygiibfndtapud';

function loadEnvFile(filename) {
  const path = join(ROOT, filename);
  if (!existsSync(path)) {
    return {};
  }
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function extractDbPassword(url) {
  if (!url) {
    return null;
  }
  const match = url.match(/postgresql:\/\/[^:]+:([^@]+)@/);
  return match?.[1] ?? null;
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') };
const token = env.SUPABASE_ACCESS_TOKEN?.trim();
const password =
  env.SUPABASE_DB_PASSWORD?.trim() ||
  extractDbPassword(env.DIRECT_URL) ||
  extractDbPassword(env.DATABASE_URL);

if (!token) {
  console.error(`
Missing SUPABASE_ACCESS_TOKEN in .env.local

1. Open https://supabase.com/dashboard/account/tokens
2. Create a token (name: "Acadia CLI")
3. Add to .env.local:

   SUPABASE_ACCESS_TOKEN=sbp_your_token_here

Then run: npm run supabase:link
`);
  process.exit(1);
}

if (!password) {
  console.error(`
Could not read database password from DIRECT_URL, DATABASE_URL, or SUPABASE_DB_PASSWORD.

Add to .env.local:

   SUPABASE_DB_PASSWORD=your_postgres_password

Then run: npm run supabase:link
`);
  process.exit(1);
}

console.log(`Linking to project ${PROJECT_REF}...`);

const result = spawnSync(
  'npx',
  ['supabase', 'link', '--project-ref', PROJECT_REF, '--password', password, '--yes'],
  {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('\nLinked successfully. Try: npm run supabase:migration:list');
