import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import {
  ACADIA_DEMO_LAYOUT_REDIRECTS,
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

  it('sends leftover Metronic security and user URLs to Acadia pages', () => {
    expect(ACADIA_DEMO_REDIRECTS).toContainEqual({
      source: '/account/security',
      destination: '/user-management/account/security',
      permanent: false,
    });
    expect(ACADIA_DEMO_REDIRECTS).toContainEqual({
      source: '/account/security/:path*',
      destination: '/user-management/account/security',
      permanent: false,
    });
    expect(ACADIA_DEMO_REDIRECTS).toContainEqual({
      source: '/user/users',
      destination: '/admin/users',
      permanent: false,
    });
  });
});

describe('ACADIA_DEMO_LAYOUT_REDIRECTS', () => {
  it('sends Metronic demo layout URLs to Acadia paths', () => {
    expect(ACADIA_DEMO_LAYOUT_REDIRECTS).toContainEqual({
      source: '/demo5/:path*',
      destination: '/:path*',
      permanent: false,
    });
    expect(ACADIA_DEMO_LAYOUT_REDIRECTS).toContainEqual({
      source: '/demo5',
      destination: '/',
      permanent: false,
    });
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

  it('does not mount Metronic demo chat, apps, or search in the Acadia header', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/components/layouts/demo1/components/header.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/ChatSheet/);
    expect(source).not.toMatch(/AppsDropdownMenu/);
    expect(source).not.toMatch(/SearchDialog/);
    expect(source).toMatch(/href="\/messages"/);
  });
});

describe('notification list query', () => {
  it('caches header notification fetches for a minute', () => {
    const source = readFileSync(
      join(process.cwd(), 'hooks/use-acadia-notifications.ts'),
      'utf8',
    );
    expect(source).toMatch(/staleTime:\s*60_000/);
  });
});

describe('Keenicons global stylesheet', () => {
  const styles = readFileSync(
    join(process.cwd(), 'components/keenicons/assets/styles.css'),
    'utf8',
  );
  const filledFace = readFileSync(
    join(process.cwd(), 'components/keenicons/assets/filled/style.css'),
    'utf8',
  ).slice(0, 400);

  it('imports only the filled family used by DEFAULT_KEENICONS_STYLE', () => {
    expect(styles).toMatch(/@import '\.\/filled\/style\.css'/);
    expect(styles).not.toMatch(/duotone\/style\.css/);
    expect(styles).not.toMatch(/outline\/style\.css/);
    expect(styles).not.toMatch(/solid\/style\.css/);
  });

  it('loads the filled font with swap and a single woff source', () => {
    expect(filledFace).toMatch(/font-display:\s*swap/);
    expect(filledFace).toMatch(/keenicons-filled\.woff/);
    expect(filledFace).not.toMatch(/keenicons-filled\.ttf/);
    expect(filledFace).not.toMatch(/keenicons-filled\.svg/);
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
