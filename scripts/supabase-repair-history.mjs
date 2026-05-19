/**
 * One-time repair: align remote supabase_migrations with local supabase/migrations.
 *
 * Context: Remote had 23 CLI-generated versions (20260516/20260519 splits) that are
 * not in this repo. Local has 11 consolidated migrations. Schema was already applied
 * via the remote splits; this script only fixes the history table.
 *
 * Run after: npm run supabase:link
 * Usage: npm run supabase:repair-history
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** Versions recorded on remote but absent from supabase/migrations/ */
const REMOTE_ORPHAN_VERSIONS = [
  '20260516121334',
  '20260516121414',
  '20260516121544',
  '20260516121606',
  '20260516121728',
  '20260516121751',
  '20260516121838',
  '20260516122000',
  '20260516122016',
  '20260516122134',
  '20260516122149',
  '20260516122205',
  '20260516122242',
  '20260516122349',
  '20260516122442',
  '20260516122630',
  '20260519012616',
  '20260519012722',
  '20260519021158',
  '20260519021223',
  '20260519021237',
  '20260519021253',
  '20260519021410',
  '20260519024707',
];

/** Local migrations to mark applied (schema already on remote from orphans above) */
const LOCAL_MARK_APPLIED = [
  '20260516120000',
  '20260516130000',
  '20260516140000',
  '20260516140001',
  '20260519120000',
  '20260519120100',
  '20260519120200',
  '20260519130000',
  '20260519130100',
  '20260519140000',
];

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

function runRepair(status, versions) {
  if (versions.length === 0) {
    return 0;
  }
  console.log(`\nRepair ${status}: ${versions.join(', ')}`);
  const spawnEnv = {
    ...process.env,
    ...loadEnvFile('.env'),
    ...loadEnvFile('.env.local'),
  };
  const linkedRef = join(ROOT, 'supabase', '.temp', 'project-ref');
  if (!existsSync(linkedRef)) {
    console.error('Project not linked. Run: npm run supabase:link');
    process.exit(1);
  }
  const result = spawnSync(
    'npx',
    ['supabase', 'migration', 'repair', '--linked', '--status', status, ...versions],
    { cwd: ROOT, stdio: 'inherit', shell: true, env: spawnEnv },
  );
  return result.status ?? 1;
}

console.log('Acadia College — Supabase migration history repair');
console.log('Project must be linked (npm run supabase:link).\n');

let code = runRepair('reverted', REMOTE_ORPHAN_VERSIONS);
if (code !== 0) {
  process.exit(code);
}

code = runRepair('applied', LOCAL_MARK_APPLIED);
if (code !== 0) {
  process.exit(code);
}

console.log('\nDone. Verify with: npm run supabase:migration:list');
console.log('Then: npm run supabase:push');
