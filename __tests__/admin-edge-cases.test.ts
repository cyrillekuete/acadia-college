import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UserStatus } from '@/app/models/user';
import { editUserSchema } from '@/lib/acadia/user-schemas';
import {
  assignableDirectoryRolesForActor,
  canChangeProtectedRoleOrStatus,
  canSendAdminPasswordReset,
  filterDirectoryUserRows,
  shouldRevokeSessionsForStatus,
  slugFromRoleRelation,
  validateRoleAssignment,
  wouldLeaveNoActiveManagers,
} from '@/lib/acadia/user-management';
import {
  generateTenantApiKeyMaterial,
  hashTenantApiKey,
} from '@/lib/acadia/tenant-api-keys.server';
import {
  expiryIsoFromDateInput,
  TENANT_API_KEY_PUBLIC_SELECT,
  tenantApiKeyCreateSchema,
  tenantApiKeySelectOmitsHash,
} from '@/lib/acadia/tenant-api-keys';

describe('filterDirectoryUserRows', () => {
  it('keeps directory roles and drops students and staff', () => {
    const rows = filterDirectoryUserRows([
      { id: '1', UserRole: { slug: 'admin' } },
      { id: '2', UserRole: { slug: 'student' } },
      { id: '3', roleSlug: 'teacher' },
      { id: '4', UserRole: [{ slug: 'bursar' }] },
    ]);
    expect(rows.map((row) => row.id)).toEqual(['1', '4']);
  });
});

describe('slugFromRoleRelation', () => {
  it('reads object and array role payloads', () => {
    expect(slugFromRoleRelation({ slug: 'registrar' })).toBe('registrar');
    expect(slugFromRoleRelation([{ slug: 'admin' }])).toBe('admin');
    expect(slugFromRoleRelation(null)).toBeNull();
  });
});

describe('wouldLeaveNoActiveManagers', () => {
  it('blocks self-delete of the last manager', () => {
    expect(
      wouldLeaveNoActiveManagers({
        accounts: [
          { id: 'admin-1', status: UserStatus.ACTIVE, roleSlug: 'admin' },
        ],
        targetId: 'admin-1',
        nextStatus: UserStatus.INACTIVE,
        nextIsTrashed: true,
      }),
    ).toBe(true);
  });
});

describe('validateRoleAssignment', () => {
  it('lets admin assign super-admin and forbids registrar', () => {
    expect(validateRoleAssignment('admin', 'super-admin')).toEqual({ ok: true });
    expect(validateRoleAssignment('registrar', 'super-admin')).toEqual({
      ok: false,
      reason: 'forbidden',
    });
  });

  it('filters assignable directory roles for the actor', () => {
    const roles = [
      { id: 'r-admin', slug: 'admin' },
      { id: 'r-super', slug: 'super-admin' },
      { id: 'r-student', slug: 'student' },
    ];
    expect(assignableDirectoryRolesForActor('registrar', roles).map((role) => role.slug)).toEqual(
      ['admin'],
    );
  });
});

describe('protected status and password reset', () => {
  it('freezes role and status on protected accounts', () => {
    expect(canChangeProtectedRoleOrStatus(true)).toBe(false);
  });

  it('still allows password reset for protected active accounts', () => {
    expect(
      canSendAdminPasswordReset({
        status: UserStatus.ACTIVE,
        isProtected: true,
      }),
    ).toBe(true);
    expect(
      canSendAdminPasswordReset({
        status: UserStatus.BLOCKED,
        isProtected: true,
      }),
    ).toBe(false);
  });

  it('revokes sessions when blocking or deactivating', () => {
    expect(shouldRevokeSessionsForStatus(UserStatus.BLOCKED)).toBe(true);
    expect(shouldRevokeSessionsForStatus(UserStatus.ACTIVE)).toBe(false);
  });
});

describe('editUserSchema', () => {
  it('requires email, name, role, and status', () => {
    expect(
      editUserSchema.safeParse({
        email: 'not-an-email',
        name: 'Ada',
        roleId: 'role-1',
        status: UserStatus.ACTIVE,
      }).success,
    ).toBe(false);
    expect(
      editUserSchema.safeParse({
        email: 'ada@school.edu',
        name: 'Ada Lovelace',
        roleId: 'role-1',
        status: UserStatus.ACTIVE,
      }).success,
    ).toBe(true);
  });
});

describe('admin user API safety', () => {
  it('persists User before Auth email and rolls back on Auth failure', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/api/acadia/admin/users/[id]/route.ts'),
      'utf8',
    );
    const userUpdateAt = source.indexOf('from(\'User\')');
    const authUpdateAt = source.indexOf('updateUserById');
    expect(userUpdateAt).toBeGreaterThan(0);
    expect(authUpdateAt).toBeGreaterThan(userUpdateAt);
    expect(source).toContain('revertUserRow');
    expect(source).toContain('LAST_ACTIVE_MANAGER_MESSAGE');
    expect(source).toContain('This account status is managed from Students or Staff.');
  });

  it('blocks last-manager self-delete and email clashes', () => {
    const del = readFileSync(
      join(process.cwd(), 'app/api/acadia/account/delete/route.ts'),
      'utf8',
    );
    expect(del).toContain('wouldLeaveNoActiveManagers');
    expect(del).toContain('LAST_ACTIVE_MANAGER_DELETE_MESSAGE');

    const email = readFileSync(
      join(process.cwd(), 'app/api/acadia/account/email/route.ts'),
      'utf8',
    );
    expect(email).toContain('EMAIL_ALREADY_EXISTS_MESSAGE');
    expect(email).toContain('user.email_changed');
  });
});

describe('User.email uniqueness', () => {
  it('creates a unique email index in the edge-case migration', () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260820210400_user_management_edge_cases.sql',
      ),
      'utf8',
    );
    expect(sql).toMatch(/CREATE UNIQUE INDEX "User_email_key"/);
  });
});

describe('directory list truncation', () => {
  it('warns when the users grid hits the directory cap', () => {
    const source = readFileSync(
      join(process.cwd(), 'components/acadia/admin/users-data-grid.tsx'),
      'utf8',
    );
    expect(source).toContain('USERS_DIRECTORY_LIST_LIMIT');
    expect(source).toContain('Showing the first');
  });
});

describe('session idle guard', () => {
  it('treats mousemove and tab visibility as activity', () => {
    const source = readFileSync(
      join(process.cwd(), 'components/acadia/session-timeout-guard.tsx'),
      'utf8',
    );
    expect(source).toContain("'mousemove'");
    expect(source).toContain('visibilitychange');
    expect(source).toContain('JWT expiry remains the hard session cap');
  });
});

describe('tenant API keys', () => {
  it('replaces the Metronic demo with the real list and create/revoke flow', () => {
    const content = readFileSync(
      join(process.cwd(), 'app/(protected)/account/api-keys/content.tsx'),
      'utf8',
    );
    expect(content).toContain('TenantApiKeysList');
    expect(content).not.toContain('ExternalServicesManageApi');
    expect(content).not.toContain('href="#"');

    const page = readFileSync(
      join(process.cwd(), 'app/(protected)/account/api-keys/page.tsx'),
      'utf8',
    );
    expect(page).not.toContain('href="#"');
    expect(page).not.toContain('Privacy Settings');

    const list = readFileSync(
      join(process.cwd(), 'components/acadia/account/tenant-api-keys-list.tsx'),
      'utf8',
    );
    expect(list).toContain('TENANT_API_KEY_PUBLIC_SELECT');
    expect(list).toContain('Create API key');
    expect(list).toContain('revokeApiKey');
  });

  it('never selects keyHash and hashes the secret on the server', () => {
    const select = TENANT_API_KEY_PUBLIC_SELECT;
    expect(select).toContain('keyPrefix');
    expect(select).not.toMatch(/keyHash/);
    expect(tenantApiKeySelectOmitsHash(select)).toBe(true);

    const createRoute = readFileSync(
      join(process.cwd(), 'app/api/acadia/account/api-keys/route.ts'),
      'utf8',
    );
    expect(createRoute).toContain('generateTenantApiKeyMaterial');
    expect(createRoute).toContain('keyHash: material.keyHash');
    const jsonReturn = createRoute.slice(createRoute.lastIndexOf('return NextResponse.json'));
    expect(jsonReturn).toContain('plaintext: material.plaintext');
    expect(jsonReturn).not.toContain('keyHash');
    expect(createRoute).toContain('canManageTenantApiKeys');
  });
});

describe('custom domain unique index', () => {
  it('creates Tenant_customDomain_uidx', () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260820240000_tenant_custom_domain_unique.sql',
      ),
      'utf8',
    );
    expect(sql).toMatch(/CREATE UNIQUE INDEX "Tenant_customDomain_uidx"/);
  });
});

describe('tenant API key material', () => {
  it('hashes the plaintext and omits the hash from the public select', () => {
    const material = generateTenantApiKeyMaterial();
    expect(material.plaintext.startsWith('acd_')).toBe(true);
    expect(material.keyPrefix).toBe(material.plaintext.slice(0, 8));
    expect(material.keyHash).toBe(hashTenantApiKey(material.plaintext));
    expect(material.keyHash).not.toBe(material.plaintext);
    expect(material.keyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tenantApiKeySelectOmitsHash(TENANT_API_KEY_PUBLIC_SELECT)).toBe(true);
    expect(tenantApiKeyCreateSchema.safeParse({ name: 'Reporting' }).success).toBe(
      true,
    );
    expect(expiryIsoFromDateInput('2099-01-01')).toBe('2099-01-01T23:59:59.000Z');
    expect(() => expiryIsoFromDateInput('2000-01-01')).toThrow(/future/);
  });
});
