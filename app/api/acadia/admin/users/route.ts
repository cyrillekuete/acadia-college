import { NextResponse } from 'next/server';
import { createUserSchema } from '@/lib/acadia/user-schemas';
import { requireAdminApi } from '@/lib/acadia/require-admin-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { acadiaEmailVerifiedAt } from '@/lib/acadia/email-verified';
import { syncSnakeCaseUsersRow } from '@/lib/acadia/sync-user-row';
import { EMAIL_ALREADY_EXISTS_MESSAGE, validateRoleAssignment } from '@/lib/acadia/user-management';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { UserStatus } from '@/app/models/user';

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { message: 'User provisioning is not configured on this server.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    );
  }

  const values = parsed.data;
  const email = values.email.trim().toLowerCase();
  const supabase = await createClient();
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: role, error: roleError } = await supabase
    .from('UserRole')
    .select('id, slug, isTrashed')
    .eq('id', values.roleId)
    .maybeSingle();

  if (roleError || !role?.id || role.isTrashed) {
    return NextResponse.json({ message: 'Select a valid role.' }, { status: 400 });
  }

  const assignment = validateRoleAssignment(auth.ctx.roleSlug, String(role.slug));
  if (!assignment.ok) {
    return NextResponse.json(
      {
        message:
          assignment.reason === 'not_directory'
            ? 'Create students and staff from the Students or Staff modules.'
            : 'You cannot assign that role.',
      },
      { status: 403 },
    );
  }

  const { data: existingUser } = await supabase
    .from('User')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existingUser?.id) {
    return NextResponse.json(
        { message: EMAIL_ALREADY_EXISTS_MESSAGE },
      { status: 400 },
    );
  }

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: values.password,
    email_confirm: true,
    user_metadata: { name: values.name.trim() },
  });

  if (authError || !authUser.user) {
    const message =
      authError?.message?.includes('already been registered') ||
      authError?.message?.includes('already exists')
        ? EMAIL_ALREADY_EXISTS_MESSAGE
        : authError?.message ?? 'Failed to create auth user.';
    return NextResponse.json({ message }, { status: 400 });
  }

  const linkedId = authUser.user.id;
  const status = values.status ?? UserStatus.ACTIVE;
  const { error: insertError } = await supabase.from('User').insert({
    id: linkedId,
    email,
    name: values.name.trim(),
    roleId: values.roleId,
    tenantId: auth.ctx.tenantId,
    status,
    country: values.country?.trim() || null,
    timezone: values.timezone?.trim() || null,
    invitedByUserId: auth.ctx.actorUserId,
    emailVerifiedAt: acadiaEmailVerifiedAt(now),
    createdAt: now,
    updatedAt: now,
    isTrashed: false,
    isProtected: false,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(linkedId);
    return NextResponse.json(
      { message: insertError.message ?? 'Failed to create user profile.' },
      { status: 400 },
    );
  }

  const usersSync = await syncSnakeCaseUsersRow(admin, {
    id: linkedId,
    email,
    name: values.name.trim(),
    roleSlug: String(role.slug),
    status,
    tenantId: auth.ctx.tenantId,
    now,
  });

  if (!usersSync.ok) {
    await supabase.from('User').delete().eq('id', linkedId);
    await admin.auth.admin.deleteUser(linkedId);
    return NextResponse.json(
      { message: usersSync.message ?? 'Failed to create user profile.' },
      { status: 400 },
    );
  }

  await appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'user.created',
    description: `Created user ${email}`,
    entityId: linkedId,
    entityType: 'User',
    tenantId: auth.ctx.tenantId,
    meta: { roleId: values.roleId, status },
  });

  return NextResponse.json({ id: linkedId }, { status: 201 });
}
