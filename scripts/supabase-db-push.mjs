/**
 * Push local migrations to the linked remote database.
 * Falls back to DIRECT_URL when the project is not linked.
 *
 * Run: npm run supabase:push
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') };
const linkedRef = join(ROOT, 'supabase', '.temp', 'project-ref');
const isLinked = existsSync(linkedRef);

const args = ['db', 'push', '--yes'];
const spawnEnv = { ...process.env };

if (env.SUPABASE_ACCESS_TOKEN) {
  spawnEnv.SUPABASE_ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN;
}

if (!isLinked) {
  const directUrl = env.DIRECT_URL?.trim();
  if (!directUrl) {
    console.error(
      'Project not linked and DIRECT_URL is missing. Run: npm run supabase:link',
    );
    process.exit(1);
  }
  console.log('Using DIRECT_URL (project not linked via CLI).');
  args.push('--db-url', directUrl);
} else {
  console.log('Pushing migrations to linked project...');
  args.push('--linked');
}

const result = spawnSync('npx', ['supabase', ...args], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: spawnEnv,
});

process.exit(result.status ?? 1);
