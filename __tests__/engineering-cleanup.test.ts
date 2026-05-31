import { describe, expect, it } from 'vitest';
import {
  ACADIA_DEMO_REDIRECTS,
  isAcadiaDemoRoute,
} from '@/lib/acadia/demo-routes';
import {
  deprecatedUserManagementResponse,
  mapAcadiaProfileToAccountUser,
} from '@/lib/api/user-management-supabase';
import type { AcadiaUserProfile } from '@/lib/supabase/queries/user';

describe('isAcadiaDemoRoute', () => {
  it('flags Metronic demo prefixes', () => {
    expect(isAcadiaDemoRoute('/store-client/home')).toBe(true);
    expect(isAcadiaDemoRoute('/account/billing/plans')).toBe(true);
    expect(isAcadiaDemoRoute('/network/user-table')).toBe(true);
  });

  it('allows Acadia routes', () => {
    expect(isAcadiaDemoRoute('/students')).toBe(false);
    expect(isAcadiaDemoRoute('/finance/fees')).toBe(false);
    expect(isAcadiaDemoRoute('/user-management/account')).toBe(false);
  });
});

describe('ACADIA_DEMO_REDIRECTS', () => {
  it('includes store-client and billing redirects', () => {
    expect(
      ACADIA_DEMO_REDIRECTS.some((entry) =>
        entry.source.startsWith('/store-client'),
      ),
    ).toBe(true);
    expect(
      ACADIA_DEMO_REDIRECTS.some((entry) =>
        entry.source.startsWith('/account/billing'),
      ),
    ).toBe(true);
  });
});

describe('deprecatedUserManagementResponse', () => {
  it('returns HTTP 410', async () => {
    const response = deprecatedUserManagementResponse();
    expect(response.status).toBe(410);
    const body = await response.json();
    expect(body.message).toContain('deprecated');
  });
});

describe('mapAcadiaProfileToAccountUser', () => {
  it('maps role and status fields', () => {
    const profile: AcadiaUserProfile = {
      id: 'user-1',
      email: 'admin@acadia-college.edu',
      name: 'Admin',
      tenantId: 'tenant-1',
      status: 'ACTIVE',
      roleId: 'role-1',
      isTrashed: false,
      isProtected: true,
      UserRole: {
        id: 'role-1',
        slug: 'administrator',
        name: 'Administrator',
      },
    };

    const user = mapAcadiaProfileToAccountUser(profile);
    expect(user.email).toBe('admin@acadia-college.edu');
    expect(user.role.slug).toBe('administrator');
    expect(user.isProtected).toBe(true);
  });
});
