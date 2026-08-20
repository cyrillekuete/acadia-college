import { NextResponse } from 'next/server';
import { AccountEmailSchema } from '@/app/(protected)/user-management/account/forms/account-email-schema';
import { acadiaEmailVerifiedAt } from '@/lib/acadia/email-verified';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { EMAIL_ALREADY_EXISTS_MESSAGE } from '@/lib/acadia/user-management';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: Request) {
  const auth = await requireSessionApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { message: 'Email updates are not configured on this server.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = AccountEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid email.' },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const previousEmail = auth.ctx.email;
  if (email === previousEmail.toLowerCase()) {
    return NextResponse.json({ message: 'Email updated.' });
  }

  const admin = createAdminClient();
  const supabase = await createClient();
  const now = acadiaEmailVerifiedAt();
  const userId = auth.ctx.actorUserId;
  const tenantId = auth.ctx.tenantId;

  const { data: clash } = await admin
    .from('User')
    .select('id')
    .eq('email', email)
    .neq('id', userId)
    .maybeSingle();
  if (clash?.id) {
    return NextResponse.json(
      { message: EMAIL_ALREADY_EXISTS_MESSAGE },
      { status: 400 },
    );
  }

  const revertProfileEmail = async () => {
    await admin
      .from('User')
      .update({ email: previousEmail, updatedAt: now })
      .eq('id', userId)
      .eq('tenantId', tenantId);
    await admin
      .from('users')
      .update({ email: previousEmail, updated_at: now })
      .eq('id', userId)
      .eq('tenant_id', tenantId);
  };

  const { error: userError } = await admin
    .from('User')
    .update({
      email,
      emailVerifiedAt: null,
      updatedAt: now,
    })
    .eq('id', userId)
    .eq('tenantId', tenantId);

  if (userError) {
    return NextResponse.json(
      { message: userError.message ?? 'Failed to update profile email.' },
      { status: 400 },
    );
  }

  const { error: usersError } = await admin
    .from('users')
    .update({ email, updated_at: now })
    .eq('id', userId)
    .eq('tenant_id', tenantId);

  if (usersError) {
    await revertProfileEmail();
    return NextResponse.json(
      { message: usersError.message ?? 'Failed to update profile email.' },
      { status: 400 },
    );
  }

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    email,
    email_confirm: false,
  });

  if (authError) {
    await revertProfileEmail();
    const message =
      authError.message?.includes('already been registered') ||
      authError.message?.includes('already exists')
        ? 'A user with this email already exists.'
        : authError.message ?? 'Failed to update email.';
    return NextResponse.json({ message }, { status: 400 });
  }

  await appendSystemLog(supabase, {
    userId,
    event: 'user.email_changed',
    entityType: 'User',
    entityId: userId,
    tenantId,
    description: `Email updated to ${email}.`,
  });

  return NextResponse.json({ message: 'Email updated.' });
}
