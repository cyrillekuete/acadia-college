import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const deleteAccountSchema = z.object({
  confirmation: z.string().trim().min(1, 'Confirmation is required.'),
});

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  if (auth.ctx.isProtected) {
    return NextResponse.json(
      { message: 'Protected accounts cannot be deleted.' },
      { status: 403 },
    );
  }

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { message: 'Account deletion is not configured on this server.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    );
  }

  if (parsed.data.confirmation.toLowerCase() !== auth.ctx.email.toLowerCase()) {
    return NextResponse.json(
      { message: 'Confirmation email does not match your account.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { error: deactivateLegacyError } = await supabase
    .from('User')
    .update({
      status: 'INACTIVE',
      isTrashed: true,
      updatedAt: nowIso,
    })
    .eq('id', auth.ctx.actorUserId)
    .eq('tenantId', auth.ctx.tenantId)
    .eq('isProtected', false);

  if (deactivateLegacyError) {
    return NextResponse.json(
      { message: 'Unable to deactivate account profile.' },
      { status: 500 },
    );
  }

  const { error: deactivateUsersError } = await supabase
    .from('users')
    .update({
      status: 'inactive',
      updated_at: nowIso,
    })
    .eq('id', auth.ctx.actorUserId)
    .eq('tenant_id', auth.ctx.tenantId);

  if (deactivateUsersError) {
    return NextResponse.json(
      { message: 'Unable to deactivate account profile.' },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(
    auth.ctx.actorUserId,
  );

  if (deleteAuthError) {
    return NextResponse.json(
      { message: 'Unable to delete authentication account.' },
      { status: 500 },
    );
  }

  await appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'account.deleted',
    entityType: 'User',
    entityId: auth.ctx.actorUserId,
    description: `User deleted their account (${auth.ctx.email}).`,
  });

  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // Auth user is already deleted; session cleanup is best-effort.
  }

  return NextResponse.json({ message: 'Account deleted.' });
}
