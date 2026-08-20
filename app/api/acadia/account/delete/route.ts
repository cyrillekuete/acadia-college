import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  EMAIL_ALREADY_EXISTS_MESSAGE,
  LAST_ACTIVE_MANAGER_DELETE_MESSAGE,
  wouldLeaveNoActiveManagers,
  type ManagerAccount,
} from '@/lib/acadia/user-management';
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
  const admin = createAdminClient();
  const userId = auth.ctx.actorUserId;
  const tenantId = auth.ctx.tenantId;

  const { data: managerRows } = await admin
    .from('User')
    .select('id, status, isTrashed, UserRole:roleId ( slug )')
    .eq('tenantId', tenantId)
    .eq('isTrashed', false);

  const managers: ManagerAccount[] = (managerRows ?? []).map((row) => {
    const role = Array.isArray(row.UserRole) ? row.UserRole[0] : row.UserRole;
    return {
      id: String(row.id),
      status: String(row.status ?? ''),
      isTrashed: Boolean(row.isTrashed),
      roleSlug:
        role && typeof role === 'object' && 'slug' in role
          ? String((role as { slug: string }).slug)
          : null,
    };
  });

  if (
    wouldLeaveNoActiveManagers({
      accounts: managers,
      targetId: userId,
      nextStatus: 'INACTIVE',
      nextIsTrashed: true,
    })
  ) {
    return NextResponse.json(
      { message: LAST_ACTIVE_MANAGER_DELETE_MESSAGE },
      { status: 409 },
    );
  }

  const { data: previousUser } = await admin
    .from('User')
    .select('status, isTrashed')
    .eq('id', userId)
    .eq('tenantId', tenantId)
    .maybeSingle();

  const { data: previousUsers } = await admin
    .from('users')
    .select('status')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const { data: staffRows } = await admin
    .from('StaffProfile')
    .select('id, isActive')
    .eq('userId', userId)
    .eq('tenantId', tenantId)
    .eq('isActive', true);

  const { data: studentRows } = await admin
    .from('StudentProfile')
    .select('id, isActive')
    .eq('userId', userId)
    .eq('tenantId', tenantId)
    .eq('isActive', true);

  const nowIso = new Date().toISOString();

  const { error: deactivateLegacyError } = await admin
    .from('User')
    .update({
      status: 'INACTIVE',
      isTrashed: true,
      updatedAt: nowIso,
    })
    .eq('id', userId)
    .eq('tenantId', tenantId)
    .eq('isProtected', false);

  if (deactivateLegacyError) {
    return NextResponse.json(
      { message: deactivateLegacyError.message ?? 'Unable to deactivate account profile.' },
      { status: 500 },
    );
  }

  const { error: deactivateUsersError } = await admin
    .from('users')
    .update({
      status: 'inactive',
      updated_at: nowIso,
    })
    .eq('id', userId)
    .eq('tenant_id', tenantId);

  if (deactivateUsersError) {
    await admin
      .from('User')
      .update({
        status: previousUser?.status ?? 'ACTIVE',
        isTrashed: Boolean(previousUser?.isTrashed),
        updatedAt: nowIso,
      })
      .eq('id', userId)
      .eq('tenantId', tenantId);
    return NextResponse.json(
      { message: 'Unable to deactivate account profile.' },
      { status: 500 },
    );
  }

  const staffIds = (staffRows ?? []).map((row) => String(row.id));
  const studentIds = (studentRows ?? []).map((row) => String(row.id));

  if (staffIds.length > 0) {
    await admin
      .from('StaffProfile')
      .update({ isActive: false, updatedAt: nowIso })
      .in('id', staffIds)
      .eq('tenantId', tenantId);
  }

  if (studentIds.length > 0) {
    await admin
      .from('StudentProfile')
      .update({ isActive: false, updatedAt: nowIso })
      .in('id', studentIds)
      .eq('tenantId', tenantId);
  }

  await appendSystemLog(supabase, {
    userId,
    event: 'account.deleted',
    entityType: 'User',
    entityId: userId,
    tenantId,
    description: `User deleted their account (${auth.ctx.email}).`,
  });

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);

  if (deleteAuthError) {
    await admin
      .from('User')
      .update({
        status: previousUser?.status ?? 'ACTIVE',
        isTrashed: Boolean(previousUser?.isTrashed),
        updatedAt: nowIso,
      })
      .eq('id', userId)
      .eq('tenantId', tenantId);
    if (previousUsers?.status) {
      await admin
        .from('users')
        .update({ status: previousUsers.status, updated_at: nowIso })
        .eq('id', userId)
        .eq('tenant_id', tenantId);
    }
    if (staffIds.length > 0) {
      await admin
        .from('StaffProfile')
        .update({ isActive: true, updatedAt: nowIso })
        .in('id', staffIds)
        .eq('tenantId', tenantId);
    }
    if (studentIds.length > 0) {
      await admin
        .from('StudentProfile')
        .update({ isActive: true, updatedAt: nowIso })
        .in('id', studentIds)
        .eq('tenantId', tenantId);
    }
    return NextResponse.json(
      { message: 'Unable to delete authentication account.' },
      { status: 500 },
    );
  }

  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // Auth user is already deleted; session cleanup is best-effort.
  }

  return NextResponse.json({ message: 'Account deleted.' });
}
