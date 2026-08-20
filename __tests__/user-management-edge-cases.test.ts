import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UserStatus } from '@/app/models/user';
import { ACADIA_DEMO_REDIRECTS } from '@/lib/acadia/demo-routes';
import { mergeDualTableUserProfile } from '@/lib/acadia/user-profile-merge';
import {
  canChangeProtectedRoleOrStatus,
  canSendAdminPasswordReset,
  isAdminDirectoryRole,
  matchesUserActivityLog,
  registryPathForRole,
  userActivityLogOrFilter,
  userStatusLogEvent,
  validateRoleAssignment,
  wouldLeaveNoActiveManagers,
  type ManagerAccount,
} from '@/lib/acadia/user-management';
import { getMenuForRole } from '@/config/menu.acadia';

const managers = (overrides: Partial<ManagerAccount>[] = []): ManagerAccount[] => {
  const base: ManagerAccount[] = [
    { id: 'admin-1', status: UserStatus.ACTIVE, isTrashed: false, roleSlug: 'admin' },
    { id: 'reg-1', status: UserStatus.ACTIVE, isTrashed: false, roleSlug: 'registrar' },
  ];
  return overrides.length ? [...base, ...overrides] : base;
};

describe('last-manager lockout', () => {
  it('blocks deactivating the last active manager', () => {
    expect(
      wouldLeaveNoActiveManagers({
        accounts: [
          { id: 'admin-1', status: UserStatus.ACTIVE, isTrashed: false, roleSlug: 'admin' },
        ],
        targetId: 'admin-1',
        nextStatus: UserStatus.INACTIVE,
      }),
    ).toBe(true);
  });

  it('blocks trashing or demoting the last manager', () => {
    const only = [
      { id: 'admin-1', status: UserStatus.ACTIVE, isTrashed: false, roleSlug: 'admin' },
    ];
    expect(
      wouldLeaveNoActiveManagers({
        accounts: only,
        targetId: 'admin-1',
        nextIsTrashed: true,
      }),
    ).toBe(true);
    expect(
      wouldLeaveNoActiveManagers({
        accounts: only,
        targetId: 'admin-1',
        nextRoleSlug: 'bursar',
      }),
    ).toBe(true);
  });

  it('allows deactivating a manager when another remains', () => {
    expect(
      wouldLeaveNoActiveManagers({
        accounts: managers(),
        targetId: 'admin-1',
        nextStatus: UserStatus.INACTIVE,
      }),
    ).toBe(false);
  });

  it('does not treat bursar as a user manager', () => {
    expect(
      wouldLeaveNoActiveManagers({
        accounts: [
          { id: 'bursar-1', status: UserStatus.ACTIVE, isTrashed: false, roleSlug: 'bursar' },
          { id: 'admin-1', status: UserStatus.ACTIVE, isTrashed: false, roleSlug: 'admin' },
        ],
        targetId: 'admin-1',
        nextStatus: UserStatus.BLOCKED,
      }),
    ).toBe(true);
  });
});

describe('isProtected freeze', () => {
  it('forbids role or status changes on protected users', () => {
    expect(canChangeProtectedRoleOrStatus(true)).toBe(false);
    expect(canChangeProtectedRoleOrStatus(false)).toBe(true);
  });
});

describe('role assignment allowlist', () => {
  it('rejects student and teacher roles on the admin Users form', () => {
    expect(validateRoleAssignment('admin', 'student').ok).toBe(false);
    expect(validateRoleAssignment('admin', 'teacher').ok).toBe(false);
    expect(validateRoleAssignment('admin', 'parent').ok).toBe(false);
    expect(isAdminDirectoryRole('student')).toBe(false);
  });

  it('allows registrar to assign bursar but not super-admin', () => {
    expect(validateRoleAssignment('registrar', 'bursar')).toEqual({ ok: true });
    expect(validateRoleAssignment('registrar', 'super-admin')).toEqual({
      ok: false,
      reason: 'forbidden',
    });
  });

  it('allows admin to assign super-admin', () => {
    expect(validateRoleAssignment('admin', 'super-admin')).toEqual({ ok: true });
    expect(validateRoleAssignment('super-admin', 'super-admin')).toEqual({ ok: true });
  });

  it('links non-directory roles to Students or Staff', () => {
    expect(registryPathForRole('student')).toBe('/students');
    expect(registryPathForRole('guardian')).toBe('/students');
    expect(registryPathForRole('teacher')).toBe('/staff');
  });
});

describe('password reset and status events', () => {
  it('skips password reset for blocked or trashed accounts', () => {
    expect(canSendAdminPasswordReset({ status: UserStatus.BLOCKED })).toBe(false);
    expect(
      canSendAdminPasswordReset({ status: UserStatus.ACTIVE, isTrashed: true }),
    ).toBe(false);
    expect(canSendAdminPasswordReset({ status: UserStatus.ACTIVE })).toBe(true);
  });

  it('maps status and password/email events', () => {
    expect(userStatusLogEvent(UserStatus.ACTIVE, UserStatus.BLOCKED)).toBe(
      'user.blocked',
    );
    expect(userStatusLogEvent(UserStatus.INACTIVE, UserStatus.ACTIVE)).toBe(
      'user.activated',
    );
  });
});

describe('activity log filters', () => {
  it('matches actor or subject user ids', () => {
    expect(matchesUserActivityLog({ userId: 'jane', entityId: 'other' }, 'jane')).toBe(
      true,
    );
    expect(matchesUserActivityLog({ userId: 'admin', entityId: 'jane' }, 'jane')).toBe(
      true,
    );
    expect(matchesUserActivityLog({ userId: 'admin', entityId: 'other' }, 'jane')).toBe(
      false,
    );
  });

  it('builds a PostgREST or filter for entity activity', () => {
    expect(userActivityLogOrFilter('user-1')).toBe(
      'userId.eq.user-1,entityId.eq.user-1',
    );
  });
});

describe('mergeDualTableUserProfile', () => {
  it('keeps the real role slug and isProtected from the PascalCase User row', () => {
    const profile = mergeDualTableUserProfile(
      {
        id: 'user-1',
        email: 'jane@school.edu',
        name: 'Jane',
        tenant_id: 'tenant-1',
        status: 'active',
        role: 'admin',
      },
      {
        roleId: 'role-admin',
        isProtected: true,
        isTrashed: false,
        UserRole: { id: 'role-admin', slug: 'admin', name: 'Admin' },
      },
    );

    expect(profile.roleId).toBe('role-admin');
    expect(profile.isProtected).toBe(true);
    expect(profile.UserRole?.slug).toBe('admin');
    expect(profile.status).toBe('ACTIVE');
  });

  it('does not map roleId to the user id when a users row exists', () => {
    const profile = mergeDualTableUserProfile({
      id: 'user-1',
      email: 'jane@school.edu',
      role: 'registrar',
      tenant_id: 't1',
      status: 'active',
    });
    expect(profile.roleId).not.toBe('user-1');
    expect(profile.UserRole?.slug).toBe('registrar');
  });
});

describe('staff-code login uniqueness', () => {
  it('fails closed unless exactly one active StaffProfile matches', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/api/auth/resolve-login/route.ts'),
      'utf8',
    );
    expect(source).toMatch(/\.eq\('isActive', true\)/);
    expect(source).toMatch(/\.limit\(2\)/);
    expect(source).toMatch(/!== 1/);
  });
});

describe('NextAuth Google provisioning', () => {
  it('does not auto-create users for unknown Google emails', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/api/auth/[...nextauth]/auth-options.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/prisma\.user\.create/);
    expect(source).toMatch(/No Acadia account exists for this Google email/);
  });
});

describe('bursar menu hides user-admin screens', () => {
  it('keeps Security but not Users, Roles, Logs, or data retention', () => {
    const paths = getMenuForRole('bursar').flatMap((item) => [
      item.path,
      ...(item.children?.map((child) => child.path) ?? []),
    ]);
    expect(paths).toContain('/user-management/account/security');
    expect(paths).not.toContain('/admin/users');
    expect(paths).not.toContain('/admin/roles');
    expect(paths).not.toContain('/admin/logs');
    expect(paths).not.toContain('/admin/data-retention');
    expect(paths).not.toContain('/account/api-keys');
  });
});
