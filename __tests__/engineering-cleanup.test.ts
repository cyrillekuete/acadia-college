import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import {
  ACADIA_DEMO_REDIRECTS,
  isAcadiaDemoRoute,
} from '@/lib/acadia/demo-routes';
import { ModulesProvider } from '@/providers/modules-provider';
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

describe('ModulesProvider', () => {
  it('returns children without wrapping store-client sheets', () => {
    const child = createElement('span', { id: 'page' });
    expect(ModulesProvider({ children: child })).toBe(child);
  });

  it('does not import store-client into the root layout provider', () => {
    const source = readFileSync(
      join(process.cwd(), 'providers/modules-provider.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/store-client/);
  });

  it('does not import StoreClientTopbar in the Acadia header', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/components/layouts/demo1/components/header.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/StoreClientTopbar/);
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
