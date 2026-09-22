import type { SupabaseClient } from '@supabase/supabase-js';
import { UserStatus } from '@/app/models/user';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  LAST_ACTIVE_MANAGER_DELETE_MESSAGE,
  slugFromRoleRelation,
  wouldLeaveNoActiveManagers,
  type ManagerAccount,
} from '@/lib/acadia/user-management';

const PROTECTED_ACCOUNT_MESSAGE = 'Protected accounts cannot be deleted.';

export type ProfileDeletionResult =
  | { ok: true; authUserId?: string | null }
  | { ok: false; message: string; status: number };

type ProfileKind = 'staff' | 'student';

function failure(message: string, status: number): ProfileDeletionResult {
  return { ok: false, message, status };
}

async function loadManagerAccounts(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<ManagerAccount[]> {
  const { data, error } = await supabase
    .from('User')
    .select('id, status, isTrashed, UserRole:roleId ( slug )')
    .eq('tenantId', tenantId)
    .eq('isTrashed', false);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    status: String(row.status ?? ''),
    isTrashed: Boolean(row.isTrashed),
    roleSlug: slugFromRoleRelation(row.UserRole),
  }));
}

async function assertLoginCanLeave(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<ProfileDeletionResult | null> {
  const { data: user, error } = await supabase
    .from('User')
    .select('id, isProtected, status, isTrashed')
    .eq('id', userId)
    .eq('tenantId', tenantId)
    .maybeSingle();

  if (error) {
    return failure(error.message, 400);
  }
  if (user?.isProtected) {
    return failure(PROTECTED_ACCOUNT_MESSAGE, 403);
  }

  const managers = await loadManagerAccounts(supabase, tenantId);
  if (
    wouldLeaveNoActiveManagers({
      accounts: managers,
      targetId: userId,
      nextStatus: UserStatus.INACTIVE,
    })
  ) {
    return failure(LAST_ACTIVE_MANAGER_DELETE_MESSAGE, 409);
  }

  return null;
}

async function setLoginActive(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  active: boolean,
): Promise<ProfileDeletionResult | null> {
  const now = new Date().toISOString();
  const { error: userError } = await supabase
    .from('User')
    .update({
      status: active ? UserStatus.ACTIVE : UserStatus.INACTIVE,
      updatedAt: now,
    })
    .eq('id', userId)
    .eq('tenantId', tenantId);

  if (userError) {
    return failure(userError.message, 400);
  }

  const { error: legacyError } = await supabase
    .from('users')
    .update({
      status: active ? 'active' : 'inactive',
      updated_at: now,
    })
    .eq('id', userId)
    .eq('tenant_id', tenantId);

  if (legacyError) {
    return failure(legacyError.message, 400);
  }

  return null;
}

async function softDeleteProfile(
  supabase: SupabaseClient,
  input: {
    kind: ProfileKind;
    tenantId: string;
    profileId: string;
    actorUserId: string;
  },
): Promise<ProfileDeletionResult> {
  const table = input.kind === 'staff' ? 'StaffProfile' : 'StudentProfile';
  const now = new Date().toISOString();

  const { data: profile, error } = await supabase
    .from(table)
    .select('id, userId, deletedAt')
    .eq('id', input.profileId)
    .eq('tenantId', input.tenantId)
    .maybeSingle();

  if (error) {
    return failure(error.message, 400);
  }
  if (!profile) {
    return failure(
      input.kind === 'staff' ? 'Staff profile not found.' : 'Student profile not found.',
      404,
    );
  }
  if (profile.deletedAt) {
    return failure(
      input.kind === 'staff'
        ? 'Staff member is already deleted.'
        : 'Student is already deleted.',
      400,
    );
  }

  const blocked = await assertLoginCanLeave(supabase, input.tenantId, profile.userId);
  if (blocked) {
    return blocked;
  }

  const { error: profileError } = await supabase
    .from(table)
    .update({ deletedAt: now, isActive: false, updatedAt: now })
    .eq('id', input.profileId)
    .eq('tenantId', input.tenantId);

  if (profileError) {
    return failure(profileError.message, 400);
  }

  const loginError = await setLoginActive(
    supabase,
    input.tenantId,
    profile.userId,
    false,
  );
  if (loginError) {
    await supabase
      .from(table)
      .update({ deletedAt: null, isActive: true, updatedAt: now })
      .eq('id', input.profileId)
      .eq('tenantId', input.tenantId);
    return loginError;
  }

  void appendSystemLog(supabase, {
    userId: input.actorUserId,
    tenantId: input.tenantId,
    event: input.kind === 'staff' ? 'staff.soft_deleted' : 'student.soft_deleted',
    description:
      input.kind === 'staff'
        ? `Soft-deleted staff ${input.profileId}`
        : `Soft-deleted student ${input.profileId}`,
    entityId: input.profileId,
    entityType: table,
  });

  return { ok: true };
}

async function restoreProfile(
  supabase: SupabaseClient,
  input: {
    kind: ProfileKind;
    tenantId: string;
    profileId: string;
    actorUserId: string;
  },
): Promise<ProfileDeletionResult> {
  const table = input.kind === 'staff' ? 'StaffProfile' : 'StudentProfile';
  const now = new Date().toISOString();

  const { data: profile, error } = await supabase
    .from(table)
    .select('id, userId, deletedAt')
    .eq('id', input.profileId)
    .eq('tenantId', input.tenantId)
    .maybeSingle();

  if (error) {
    return failure(error.message, 400);
  }
  if (!profile) {
    return failure(
      input.kind === 'staff' ? 'Staff profile not found.' : 'Student profile not found.',
      404,
    );
  }
  if (!profile.deletedAt) {
    return failure(
      input.kind === 'staff'
        ? 'Staff member is not deleted.'
        : 'Student is not deleted.',
      400,
    );
  }

  const { error: profileError } = await supabase
    .from(table)
    .update({ deletedAt: null, isActive: true, updatedAt: now })
    .eq('id', input.profileId)
    .eq('tenantId', input.tenantId);

  if (profileError) {
    return failure(profileError.message, 400);
  }

  const loginError = await setLoginActive(supabase, input.tenantId, profile.userId, true);
  if (loginError) {
    await supabase
      .from(table)
      .update({ deletedAt: profile.deletedAt, isActive: false, updatedAt: now })
      .eq('id', input.profileId)
      .eq('tenantId', input.tenantId);
    return loginError;
  }

  void appendSystemLog(supabase, {
    userId: input.actorUserId,
    tenantId: input.tenantId,
    event: input.kind === 'staff' ? 'staff.restored' : 'student.restored',
    description:
      input.kind === 'staff'
        ? `Restored staff ${input.profileId}`
        : `Restored student ${input.profileId}`,
    entityId: input.profileId,
    entityType: table,
  });

  return { ok: true };
}

async function purgeProfile(
  supabase: SupabaseClient,
  input: {
    kind: ProfileKind;
    tenantId: string;
    profileId: string;
    actorUserId: string;
  },
): Promise<ProfileDeletionResult> {
  const table = input.kind === 'staff' ? 'StaffProfile' : 'StudentProfile';
  const { data: profile, error: lookupError } = await supabase
    .from(table)
    .select('id, userId, deletedAt')
    .eq('id', input.profileId)
    .eq('tenantId', input.tenantId)
    .maybeSingle();

  if (lookupError) {
    return failure(lookupError.message, 400);
  }
  if (!profile) {
    return failure(
      input.kind === 'staff' ? 'Staff profile not found.' : 'Student profile not found.',
      404,
    );
  }
  if (!profile.deletedAt) {
    return failure(
      input.kind === 'staff'
        ? 'Staff member must be deleted before they can be removed permanently.'
        : 'Student must be deleted before they can be removed permanently.',
      400,
    );
  }

  const blocked = await assertLoginCanLeave(supabase, input.tenantId, profile.userId);
  if (blocked) {
    return blocked;
  }

  const rpcName =
    input.kind === 'staff' ? 'acadia_purge_staff_profile' : 'acadia_purge_student_profile';
  const { data, error } = await supabase.rpc(rpcName, {
    p_tenant_id: input.tenantId,
    p_profile_id: input.profileId,
  });

  if (error) {
    return failure(error.message, 400);
  }

  const payload = data as { userId?: string | null } | null;
  const authUserId = payload?.userId ?? null;

  void appendSystemLog(supabase, {
    userId: input.actorUserId,
    tenantId: input.tenantId,
    event: input.kind === 'staff' ? 'staff.purged' : 'student.purged',
    description:
      input.kind === 'staff'
        ? `Permanently deleted staff ${input.profileId}`
        : `Permanently deleted student ${input.profileId}`,
    entityId: input.profileId,
    entityType: table,
  });

  return { ok: true, authUserId };
}

export function softDeleteStaffProfile(
  supabase: SupabaseClient,
  input: { tenantId: string; profileId: string; actorUserId: string },
): Promise<ProfileDeletionResult> {
  return softDeleteProfile(supabase, { ...input, kind: 'staff' });
}

export function restoreStaffProfile(
  supabase: SupabaseClient,
  input: { tenantId: string; profileId: string; actorUserId: string },
): Promise<ProfileDeletionResult> {
  return restoreProfile(supabase, { ...input, kind: 'staff' });
}

export function purgeStaffProfile(
  supabase: SupabaseClient,
  input: { tenantId: string; profileId: string; actorUserId: string },
): Promise<ProfileDeletionResult> {
  return purgeProfile(supabase, { ...input, kind: 'staff' });
}

export function softDeleteStudentProfile(
  supabase: SupabaseClient,
  input: { tenantId: string; profileId: string; actorUserId: string },
): Promise<ProfileDeletionResult> {
  return softDeleteProfile(supabase, { ...input, kind: 'student' });
}

export function restoreStudentProfile(
  supabase: SupabaseClient,
  input: { tenantId: string; profileId: string; actorUserId: string },
): Promise<ProfileDeletionResult> {
  return restoreProfile(supabase, { ...input, kind: 'student' });
}

export async function finalizeProfileDeletion(
  supabase: SupabaseClient,
  result: ProfileDeletionResult,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!result.ok) {
    return { status: result.status, body: { message: result.message } };
  }

  const authUserId = result.authUserId;
  if (!authUserId) {
    return { status: 200, body: { ok: true } };
  }

  const { error } = await supabase.auth.admin.deleteUser(authUserId);
  if (error) {
    return {
      status: 200,
      body: {
        ok: true,
        authWarning: error.message || 'Profile removed, but the login could not be deleted.',
      },
    };
  }

  return { status: 200, body: { ok: true } };
}

export function purgeStudentProfile(
  supabase: SupabaseClient,
  input: { tenantId: string; profileId: string; actorUserId: string },
): Promise<ProfileDeletionResult> {
  return purgeProfile(supabase, { ...input, kind: 'student' });
}
