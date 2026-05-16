/**
 * Quick smoke test for Acadia Supabase auth (run: node scripts/manual-auth-smoke.mjs)
 * Loads .env.local via dotenv if available, else process.env.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const base =
  process.env.SMOKE_BASE_URL?.replace(/\/$/, '') ||
  process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
  'http://localhost:3001';

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function testMiddlewareRedirect() {
  const res = await fetch(`${base}/students`, { redirect: 'manual' });
  const location = res.headers.get('location') || '';
  if (res.status !== 307 && res.status !== 302 && res.status !== 308) {
    fail('middleware redirect status', `got ${res.status}`);
    return;
  }
  if (!location.includes('/signin') || !location.includes('next=')) {
    fail('middleware redirect URL', location);
    return;
  }
  pass('middleware unauthenticated redirect', location);
}

async function testSignInPage() {
  const res = await fetch(`${base}/signin`);
  if (!res.ok) {
    fail('signin page', `status ${res.status}`);
    return;
  }
  const html = await res.text();
  if (!html.includes('Sign in to Acadia College')) {
    fail('signin page content', 'missing heading');
    return;
  }
  pass('signin page loads');
}

async function testSupabaseSignIn() {
  if (!url || !key) {
    fail('supabase env', 'missing NEXT_PUBLIC_SUPABASE_*');
    return;
  }

  const supabase = createClient(url, key);
  const email = 'admin@acadia-college.edu';
  const password = 'Acadia2026!';

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    fail('supabase signInWithPassword', error.message);
    return;
  }
  if (!data.user) {
    fail('supabase signInWithPassword', 'no user');
    return;
  }
  pass('supabase signInWithPassword', data.user.email);

  const { data: profile, error: profileError } = await supabase
    .from('User')
    .select('id, status, tenantId, isTrashed, UserRole(slug, name, isTrashed)')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    fail('profile fetch', profileError.message);
    await supabase.auth.signOut();
    return;
  }
  if (!profile?.tenantId || profile.status !== 'ACTIVE') {
    fail('profile gate data', JSON.stringify(profile));
    await supabase.auth.signOut();
    return;
  }
  pass('profile fetch + ACTIVE tenant', profile.UserRole?.slug ?? 'no role');

  await supabase.auth.signOut();
  pass('supabase signOut');
}

async function main() {
  console.log(`\nAcadia auth smoke @ ${base}\n`);
  await testSignInPage();
  await testMiddlewareRedirect();
  await testSupabaseSignIn();

  const failed = results.filter((r) => !r.ok);
  const passed = results.length - failed.length;
  console.log(`\n${passed}/${results.length} passed`);
  if (failed.length) {
    console.log(
      'Note: Supabase API tests need network access to your project host.',
    );
  }
  console.log('');
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
