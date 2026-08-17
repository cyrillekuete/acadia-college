import { NextResponse } from 'next/server';
import { createUserSchema } from '@/lib/acadia/user-schemas';
import { requireAdminApi } from '@/lib/acadia/require-admin-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { acadiaEmailVerifiedAt } from '@/lib/acadia/email-verified';
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
  const supabase = await createClient();
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: values.email.trim().toLowerCase(),
    password: values.password,
    email_confirm: true,
    user_metadata: { name: values.name.trim() },
  });

  if (authError || !authUser.user) {
    const message =
      authError?.message?.includes('already been registered') ||
      authError?.message?.includes('already exists')
        ? 'A user with this email already exists.'
        : authError?.message ?? 'Failed to create auth user.';
    return NextResponse.json({ message }, { status: 400 });
  }

  const linkedId = authUser.user.id;
  const { error: insertError } = await supabase.from('User').insert({
    id: linkedId,
    email: values.email.trim().toLowerCase(),
    name: values.name.trim(),
    roleId: values.roleId,
    tenantId: auth.ctx.tenantId,
    status: values.status ?? UserStatus.ACTIVE,
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

  await appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'user.created',
    description: `Created user ${values.email}`,
    entityId: linkedId,
    entityType: 'User',
    meta: { roleId: values.roleId, status: values.status },
  });

  return NextResponse.json({ id: linkedId }, { status: 201 });
}
