import { NextResponse } from 'next/server';
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

  const origin =
    process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    'http://localhost:3000';

  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/change-password')}`;
  const admin = createAdminClient();

  const { error: resetError } = await admin.auth.resetPasswordForEmail(
    target.email,
    { redirectTo },
  );

  if (resetError) {
    return NextResponse.json(
      { message: resetError.message ?? 'Failed to send password reset email.' },
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
