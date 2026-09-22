import { describe, expect, it } from 'vitest';
import {
  mergeDualTableUserProfile,
  preferredTenantId,
} from '@/lib/acadia/user-profile-merge';

describe('preferredTenantId', () => {
  it('prefers the legacy User tenant when both tables disagree', () => {
    expect(preferredTenantId('legacy-tenant', 'users-tenant')).toBe(
      'legacy-tenant',
    );
  });

  it('falls back to users.tenant_id when the legacy tenant is missing', () => {
    expect(preferredTenantId(null, 'users-tenant')).toBe('users-tenant');
    expect(preferredTenantId('   ', 'users-tenant')).toBe('users-tenant');
  });

  it('returns null when neither tenant is set', () => {
    expect(preferredTenantId(null, null)).toBeNull();
    expect(preferredTenantId(' ', '')).toBeNull();
  });
});

describe('mergeDualTableUserProfile tenant', () => {
  it('uses the legacy tenant so session scope matches RLS', () => {
    const profile = mergeDualTableUserProfile(
      {
        id: 'user-1',
        email: 'jane@school.edu',
        tenant_id: 'users-tenant',
        status: 'active',
        role: 'admin',
      },
      {
        tenantId: 'legacy-tenant',
        roleId: 'role-admin',
      },
    );

    expect(profile.tenantId).toBe('legacy-tenant');
  });

  it('keeps users.tenant_id when no legacy User tenant is present', () => {
    const profile = mergeDualTableUserProfile({
      id: 'user-1',
      email: 'jane@school.edu',
      tenant_id: 'users-tenant',
      status: 'active',
      role: 'admin',
    });

    expect(profile.tenantId).toBe('users-tenant');
  });
});
