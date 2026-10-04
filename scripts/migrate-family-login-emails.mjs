import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

// Run once with `node scripts/migrate-family-login-emails.mjs --apply` after
// reviewing the default dry-run output.
nextEnv.loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.',
  );
}

const applyChanges = process.argv.includes('--apply');
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function emailForName(name, suffix = 1) {
  const tokens = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const normalize = (part) =>
    part
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .replace(/\.{2,}/g, '.');
  const parts = [
    normalize(tokens[0] ?? ''),
    normalize(tokens.at(-1) ?? ''),
  ].filter(Boolean);
  const base = parts.join('.') || 'user';
  return `${base}${suffix > 1 ? `.${suffix}` : ''}@acadia.com`;
}

async function readAllAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

const [appUsers, authUsers] = await Promise.all([
  required(
    admin
      .from('users')
      .select('id, email, name, role, tenant_id')
      .in('role', ['student', 'parent']),
    'Load application users',
  ),
  readAllAuthUsers(),
]);

const syntheticUsers = appUsers.filter((user) => {
  const email = String(user.email ?? '').toLowerCase();
  return user.role === 'student'
    ? email.endsWith('@student.acadia.local')
    : email.endsWith('@guardian.acadia.local');
});

const studentUserIds = syntheticUsers
  .filter((u) => u.role === 'student')
  .map((u) => u.id);
const legacyUserIds = new Set(syntheticUsers.map((user) => user.id));
const legacyUsers = legacyUserIds.size
  ? await required(
      admin
        .from('User')
        .select('id, email')
        .in('id', [...legacyUserIds]),
      'Load legacy profiles',
    )
  : [];
const studentLinks = studentUserIds.length
  ? await required(
      admin
        .from('user_profiles')
        .select('user_id, role_specific_id')
        .in('user_id', studentUserIds),
      'Load student identity links',
    )
  : [];
const studentRows = studentLinks.length
  ? await required(
      admin
        .from('students')
        .select('student_id, first_name, last_name')
        .in(
          'student_id',
          studentLinks.map((row) => row.role_specific_id).filter(Boolean),
        ),
      'Load student names',
    )
  : [];

const studentNameByUserId = new Map();
for (const link of studentLinks) {
  const row = studentRows.find(
    (student) => student.student_id === link.role_specific_id,
  );
  if (row)
    studentNameByUserId.set(link.user_id, `${row.first_name} ${row.last_name}`);
}

const authById = new Map(authUsers.map((user) => [user.id, user]));
const occupied = new Set(
  authUsers.map((user) => user.email?.toLowerCase()).filter(Boolean),
);
for (const user of syntheticUsers) {
  occupied.delete(String(user.email ?? '').toLowerCase());
  if (
    String(authById.get(user.id)?.email ?? '')
      .toLowerCase()
      .endsWith('@acadia.com')
  ) {
    occupied.delete(String(authById.get(user.id).email).toLowerCase());
  }
}
const legacyEmailById = new Map(
  legacyUsers.map((user) => [user.id, user.email]),
);

const changes = [];
for (const user of syntheticUsers) {
  const authUser = authById.get(user.id);
  if (!authUser)
    throw new Error(`Auth account missing for ${user.id}; no changes applied.`);
  const name =
    user.role === 'student' ? studentNameByUserId.get(user.id) : user.name;
  if (!String(name ?? '').trim())
    throw new Error(`Name missing for ${user.id}; no changes applied.`);
  let suffix = 1;
  const alreadyMigratedEmail = String(authUser.email ?? '').toLowerCase();
  let nextEmail = alreadyMigratedEmail.endsWith('@acadia.com')
    ? alreadyMigratedEmail
    : emailForName(name, suffix);
  while (occupied.has(nextEmail.toLowerCase()))
    nextEmail = emailForName(name, ++suffix);
  occupied.add(nextEmail.toLowerCase());
  changes.push({
    user,
    nextEmail,
    oldEmail: String(user.email),
    legacyEmail: legacyEmailById.get(user.id),
  });
}

console.log(
  `${applyChanges ? 'Applying' : 'Dry run:'} ${changes.length} generated login email update(s).`,
);
for (const change of changes)
  console.log(`${change.user.role}: ${change.oldEmail} -> ${change.nextEmail}`);
if (!applyChanges) {
  console.log(
    'No changes made. Rerun with --apply to update Supabase Auth and profile login emails.',
  );
} else {
  for (const change of changes) {
    const { user, nextEmail, legacyEmail } = change;
    const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
      email: nextEmail,
      email_confirm: true,
    });
    if (authError)
      throw new Error(`Auth update failed for ${user.id}: ${authError.message}`);

    if (legacyEmail !== undefined) {
      const { error } = await admin
        .from('User')
        .update({ email: nextEmail })
        .eq('id', user.id);
      if (error)
        throw new Error(
          `Legacy profile update failed for ${user.id}: ${error.message}`,
        );
    }
    const { error } = await admin
      .from('users')
      .update({ email: nextEmail, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error)
      throw new Error(
        `Application profile update failed for ${user.id}: ${error.message}`,
      );
  }
  console.log(
    'Migration completed. Passwords and contact-email fields were not changed.',
  );
}
