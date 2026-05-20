import { NextResponse } from 'next/server';
import { getAppOrigin } from '@/lib/auth/app-origin';
import { sendPasswordRecoveryEmail } from '@/lib/auth/password-recovery';
import { requireAdminApi } from '@/lib/acadia/require-admin-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { message: 'Password reset is not configured on this server.' },
      { status: 503 },
    );
  }

  const { id: targetUserId } = await context.params;
  const supabase = await createClient();

  const { data: target, error: targetError } = await supabase
    .from('User')
    .select('id, email, tenantId')
    .eq('id', targetUserId)
    .eq('tenantId', auth.ctx.tenantId)
    .maybeSingle();

  if (targetError || !target?.email) {
    return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  }

  const admin = createAdminClient();
  const recovery = await sendPasswordRecoveryEmail(
    admin,
    target.email,
    getAppOrigin(),
  );

  if (!recovery.ok) {
    return NextResponse.json(
      { message: recovery.message ?? 'Failed to send password reset email.' },
      { status: 400 },
    );
  }

  await appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'user.password_reset',
    description: `Password reset email sent to ${target.email}`,
    entityId: targetUserId,
    entityType: 'User',
  });

  return NextResponse.json({
    message: 'Password reset email sent if the address is valid.',
  });
}
