import { NextResponse } from 'next/server';
import { AccountEmailSchema } from '@/app/(protected)/user-management/account/forms/account-email-schema';
import { acadiaEmailVerifiedAt } from '@/lib/acadia/email-verified';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
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
  if (email === auth.ctx.email.toLowerCase()) {
    return NextResponse.json({ message: 'Email updated.' });
  }

  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(
    auth.ctx.actorUserId,
    {
      email,
      email_confirm: true,
    },
  );

  if (authError) {
    const message =
      authError.message?.includes('already been registered') ||
      authError.message?.includes('already exists')
        ? 'A user with this email already exists.'
        : authError.message ?? 'Failed to update email.';
    return NextResponse.json({ message }, { status: 400 });
  }

  const supabase = await createClient();
  const now = acadiaEmailVerifiedAt();

  const { error: userError } = await supabase
    .from('User')
    .update({
      email,
      emailVerifiedAt: now,
      updatedAt: now,
    })
    .eq('id', auth.ctx.actorUserId)
    .eq('tenantId', auth.ctx.tenantId);

  if (userError) {
    return NextResponse.json(
      { message: userError.message ?? 'Failed to update profile email.' },
      { status: 400 },
    );
  }

  await supabase
    .from('users')
    .update({ email, updated_at: now })
    .eq('id', auth.ctx.actorUserId)
    .eq('tenant_id', auth.ctx.tenantId);

  await appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'user.updated',
    entityType: 'User',
    entityId: auth.ctx.actorUserId,
    description: `Email updated to ${email}.`,
  });

  return NextResponse.json({ message: 'Email updated.' });
}
