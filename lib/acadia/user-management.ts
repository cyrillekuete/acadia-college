import { UserStatus } from '@/app/models/user';
import { canManageUsers } from '@/lib/acadia/roles';
import type { SystemLogEvent } from '@/lib/acadia/system-log';

export const USER_MANAGER_ROLE_SLUGS = [
  'admin',
  'super-admin',
  'registrar',
] as const;

export const ADMIN_DIRECTORY_ROLE_SLUGS = [
  'admin',
  'super-admin',
  'registrar',
  'financial-director',
  'bursar',
] as const;

export type UserManagerRoleSlug = (typeof USER_MANAGER_ROLE_SLUGS)[number];
export type AdminDirectoryRoleSlug = (typeof ADMIN_DIRECTORY_ROLE_SLUGS)[number];

export type RoleAssignmentDenial = 'not_directory' | 'forbidden' | 'unknown';

export type ManagerAccount = {
  id: string;
  status: string;
  isTrashed?: boolean;
  roleSlug: string | null | undefined;
};

export const LAST_ACTIVE_MANAGER_MESSAGE =
  'Cannot remove the last active user manager.';

export const LAST_ACTIVE_MANAGER_DELETE_MESSAGE =
  'Cannot delete the last active user manager.';

export const EMAIL_ALREADY_EXISTS_MESSAGE =
  'A user with this email already exists.';

export const USERS_DIRECTORY_LIST_LIMIT = 2000;

function normalizeSlug(slug: string | null | undefined): string {
  return slug?.trim().toLowerCase() ?? '';
}

export function isUserManagerRole(slug: string | null | undefined): boolean {
  return (USER_MANAGER_ROLE_SLUGS as readonly string[]).includes(
    normalizeSlug(slug),
  );
}

export function isAdminDirectoryRole(slug: string | null | undefined): boolean {
  return (ADMIN_DIRECTORY_ROLE_SLUGS as readonly string[]).includes(
    normalizeSlug(slug),
  );
}

export function slugFromRoleRelation(role: unknown): string | null {
  const value = Array.isArray(role) ? role[0] : role;
  if (value && typeof value === 'object' && 'slug' in value) {
    const slug = (value as { slug?: unknown }).slug;
    return typeof slug === 'string' && slug.trim() ? slug : null;
  }
  return null;
}

export function filterDirectoryUserRows<
  T extends { UserRole?: unknown; roleSlug?: string | null },
>(rows: T[]): T[] {
  return rows.filter((row) =>
    isAdminDirectoryRole(row.roleSlug ?? slugFromRoleRelation(row.UserRole)),
  );
}

export function isActiveManager(account: ManagerAccount): boolean {
  return (
    isUserManagerRole(account.roleSlug) &&
    account.status === UserStatus.ACTIVE &&
    !account.isTrashed
  );
}

export function countActiveManagers(accounts: ManagerAccount[]): number {
  return accounts.filter(isActiveManager).length;
}

/** True when applying the next state to `targetId` would leave zero active managers. */
export function wouldLeaveNoActiveManagers(input: {
  accounts: ManagerAccount[];
  targetId: string;
  nextStatus?: string;
  nextRoleSlug?: string | null;
  nextIsTrashed?: boolean;
}): boolean {
  const next = input.accounts.map((account) => {
    if (account.id !== input.targetId) {
      return account;
    }
    return {
      ...account,
      status: input.nextStatus ?? account.status,
      roleSlug:
        input.nextRoleSlug !== undefined ? input.nextRoleSlug : account.roleSlug,
      isTrashed:
        input.nextIsTrashed !== undefined
          ? input.nextIsTrashed
          : account.isTrashed,
    };
  });
  return countActiveManagers(next) === 0 && countActiveManagers(input.accounts) > 0;
}

export function canChangeProtectedRoleOrStatus(isProtected: boolean): boolean {
  return !isProtected;
}

export function validateRoleAssignment(
  actorSlug: string | null | undefined,
  targetSlug: string | null | undefined,
): { ok: true } | { ok: false; reason: RoleAssignmentDenial } {
  const target = normalizeSlug(targetSlug);
  if (!target) {
    return { ok: false, reason: 'unknown' };
  }
  if (!isAdminDirectoryRole(target)) {
    return { ok: false, reason: 'not_directory' };
  }
  if (!canManageUsers(actorSlug)) {
    return { ok: false, reason: 'forbidden' };
  }
  if (target === 'super-admin') {
    const actor = normalizeSlug(actorSlug);
    if (actor !== 'admin' && actor !== 'super-admin') {
      return { ok: false, reason: 'forbidden' };
    }
  }
  return { ok: true };
}

export function assignableDirectoryRolesForActor(
  actorSlug: string | null | undefined,
  roles: Array<{ id: string; slug: string }>,
): Array<{ id: string; slug: string }> {
  return roles.filter(
    (role) => validateRoleAssignment(actorSlug, role.slug).ok,
  );
}

export function matchesUserActivityLog(
  row: { userId?: string | null; entityId?: string | null },
  subjectUserId: string,
): boolean {
  return row.userId === subjectUserId || row.entityId === subjectUserId;
}

/** PostgREST `or` filter for activity on a user (actor or subject). */
export function userActivityLogOrFilter(userId: string): string {
  return `userId.eq.${userId},entityId.eq.${userId}`;
}

export function registryPathForRole(slug: string | null | undefined): string {
  const normalized = normalizeSlug(slug);
  if (
    normalized === 'student' ||
    normalized === 'parent' ||
    normalized === 'guardian'
  ) {
    return '/students';
  }
  return '/staff';
}

export function usersTableStatusFromUserStatus(status: string): string {
  return status.trim().toLowerCase();
}

export function shouldRevokeSessionsForStatus(status: string): boolean {
  return status === UserStatus.INACTIVE || status === UserStatus.BLOCKED;
}

/** Protected accounts may still receive a reset so they can sign in. */
export function canSendAdminPasswordReset(input: {
  status: string;
  isTrashed?: boolean;
  isProtected?: boolean;
}): boolean {
  if (input.isTrashed) {
    return false;
  }
  return input.status !== UserStatus.BLOCKED;
}

/** Maps user status transitions to audit log events. */
export function userStatusLogEvent(
  previous: string,
  next: string,
): SystemLogEvent | null {
  if (previous === next) {
    return null;
  }
  if (next === UserStatus.ACTIVE) {
    return 'user.activated';
  }
  if (next === UserStatus.INACTIVE) {
    return 'user.deactivated';
  }
  if (next === UserStatus.BLOCKED) {
    return 'user.blocked';
  }
  return 'user.updated';
}
