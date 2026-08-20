import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/acadia/require-admin-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { syncSnakeCaseUsersRow, revokeUserSessions } from '@/lib/acadia/sync-user-row';
import { editUserSchema } from '@/lib/acadia/user-schemas';
import {
  canChangeProtectedRoleOrStatus,
  EMAIL_ALREADY_EXISTS_MESSAGE,
  isAdminDirectoryRole,
  LAST_ACTIVE_MANAGER_MESSAGE,
  shouldRevokeSessionsForStatus,
  userStatusLogEvent,
  validateRoleAssignment,
  wouldLeaveNoActiveManagers,
  type ManagerAccount,
} from '@/lib/acadia/user-management';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

type TargetUser = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  roleId: string;
  tenantId: string;
  isProtected: boolean;
  isTrashed: boolean;
  updatedAt: string | null;
  UserRole: { id: string; slug: string; isTrashed?: boolean } | null;
};

async function loadTarget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string,
): Promise<TargetUser | null> {
  const { data, error } = await supabase
    .from('User')
    .select(
      'id, email, name, status, roleId, tenantId, isProtected, isTrashed, updatedAt, UserRole:roleId ( id, slug, isTrashed )',
    )
    .eq('id', userId)
    .eq('tenantId', tenantId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const roleRaw = data.UserRole;
  const role = Array.isArray(roleRaw) ? roleRaw[0] : roleRaw;
  return {
    ...(data as Omit<TargetUser, 'UserRole'>),
    UserRole: role
      ? {
          id: String((role as { id: string }).id),
          slug: String((role as { slug: string }).slug),
          isTrashed: Boolean((role as { isTrashed?: boolean }).isTrashed),
        }
      : null,
  };
}

async function loadManagers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
): Promise<ManagerAccount[]> {
  const { data } = await supabase
    .from('User')
    .select('id, status, isTrashed, UserRole:roleId ( slug )')
    .eq('tenantId', tenantId)
    .eq('isTrashed', false);

  return (data ?? []).map((row) => {
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
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { message: 'User updates are not configured on this server.' },
      { status: 503 },
    );
  }

  const { id: targetUserId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = editUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    );
  }

  const values = parsed.data;
  const supabase = await createClient();
  const admin = createAdminClient();
  const target = await loadTarget(supabase, targetUserId, auth.ctx.tenantId);

  if (!target) {
    return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  }

  if (
    values.expectedUpdatedAt &&
    target.updatedAt &&
    values.expectedUpdatedAt !== target.updatedAt
  ) {
    return NextResponse.json(
      { message: 'This user was updated elsewhere. Refresh and try again.' },
      { status: 409 },
    );
  }

  const { data: nextRole, error: roleError } = await supabase
    .from('UserRole')
    .select('id, slug, isTrashed')
    .eq('id', values.roleId)
    .maybeSingle();

  if (roleError || !nextRole?.id || nextRole.isTrashed) {
    return NextResponse.json({ message: 'Select a valid role.' }, { status: 400 });
  }

  const currentSlug = target.UserRole?.slug ?? '';
  const nextSlug = String(nextRole.slug);
  const roleChanging = values.roleId !== target.roleId;
  const statusChanging = values.status !== target.status;
  const directoryTarget = isAdminDirectoryRole(currentSlug);

  if (roleChanging) {
    if (!directoryTarget) {
      return NextResponse.json(
        { message: 'This account role is managed from Students or Staff.' },
        { status: 400 },
      );
    }
    const assignment = validateRoleAssignment(auth.ctx.roleSlug, nextSlug);
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
  }

  if (statusChanging && !directoryTarget) {
    return NextResponse.json(
      { message: 'This account status is managed from Students or Staff.' },
      { status: 400 },
    );
  }

  if (
    (roleChanging || statusChanging) &&
    !canChangeProtectedRoleOrStatus(target.isProtected)
  ) {
    return NextResponse.json(
      { message: 'Protected accounts cannot change role or status.' },
      { status: 403 },
    );
  }

  const nextIsTrashed =
    values.isTrashed !== undefined ? values.isTrashed : target.isTrashed;

  const managers = await loadManagers(supabase, auth.ctx.tenantId);
  if (
    wouldLeaveNoActiveManagers({
      accounts: managers,
      targetId: target.id,
      nextStatus: values.status,
      nextRoleSlug: nextSlug,
      nextIsTrashed,
    })
  ) {
    return NextResponse.json(
      { message: LAST_ACTIVE_MANAGER_MESSAGE },
      { status: 409 },
    );
  }

  const email = values.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const emailChanging = email !== target.email.toLowerCase();

  if (emailChanging) {
    const { data: clash } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .neq('id', target.id)
      .maybeSingle();
    if (clash?.id) {
      return NextResponse.json(
        { message: EMAIL_ALREADY_EXISTS_MESSAGE },
        { status: 400 },
      );
    }
  }

  const { error: updateError } = await supabase
    .from('User')
    .update({
      email,
      name: values.name.trim(),
      roleId: values.roleId,
      status: values.status,
      country: values.country?.trim() || null,
      timezone: values.timezone?.trim() || null,
      isTrashed: nextIsTrashed,
      updatedAt: now,
    })
    .eq('id', target.id)
    .eq('tenantId', auth.ctx.tenantId);

  if (updateError) {
    return NextResponse.json(
      { message: updateError.message ?? 'Failed to update user.' },
      { status: 400 },
    );
  }

  const revertUserRow = async () => {
    await supabase
      .from('User')
      .update({
        email: target.email,
        name: target.name,
        roleId: target.roleId,
        status: target.status,
        isTrashed: target.isTrashed,
        updatedAt: target.updatedAt ?? now,
      })
      .eq('id', target.id)
      .eq('tenantId', auth.ctx.tenantId);
  };

  const usersSync = await syncSnakeCaseUsersRow(admin, {
    id: target.id,
    email,
    name: values.name.trim(),
    roleSlug: nextSlug,
    status: values.status,
    tenantId: auth.ctx.tenantId,
    now,
  });
  if (!usersSync.ok) {
    await revertUserRow();
    return NextResponse.json({ message: usersSync.message }, { status: 400 });
  }

  if (emailChanging) {
    const { error: authError } = await admin.auth.admin.updateUserById(target.id, {
      email,
      email_confirm: true,
    });
    if (authError) {
      await revertUserRow();
      await syncSnakeCaseUsersRow(admin, {
        id: target.id,
        email: target.email,
        name: target.name ?? email,
        roleSlug: currentSlug,
        status: target.status,
        tenantId: auth.ctx.tenantId,
        now,
      });
      const message =
        authError.message?.includes('already been registered') ||
        authError.message?.includes('already exists')
          ? EMAIL_ALREADY_EXISTS_MESSAGE
          : authError.message ?? 'Failed to update email.';
      return NextResponse.json({ message }, { status: 400 });
    }
  }

  if (shouldRevokeSessionsForStatus(values.status) && statusChanging) {
    await revokeUserSessions(admin, target.id);
  }

  const statusEvent = userStatusLogEvent(target.status, values.status);
  if (statusEvent) {
    await appendSystemLog(supabase, {
      userId: auth.ctx.actorUserId,
      event: statusEvent,
      description: `User ${email} status → ${values.status}`,
      entityId: target.id,
      entityType: 'User',
      tenantId: auth.ctx.tenantId,
    });
  }
  if (roleChanging) {
    await appendSystemLog(supabase, {
      userId: auth.ctx.actorUserId,
      event: 'user.role_changed',
      description: `User ${email} role changed`,
      entityId: target.id,
      entityType: 'User',
      tenantId: auth.ctx.tenantId,
      meta: { fromRoleId: target.roleId, toRoleId: values.roleId },
    });
  } else if (emailChanging) {
    await appendSystemLog(supabase, {
      userId: auth.ctx.actorUserId,
      event: 'user.email_changed',
      description: `User email updated to ${email}`,
      entityId: target.id,
      entityType: 'User',
      tenantId: auth.ctx.tenantId,
    });
  } else if (!statusEvent) {
    await appendSystemLog(supabase, {
      userId: auth.ctx.actorUserId,
      event: 'user.updated',
      description: `Updated user ${email}`,
      entityId: target.id,
      entityType: 'User',
      tenantId: auth.ctx.tenantId,
    });
  }

  return NextResponse.json({ id: target.id });
}
