import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getMenuForRole } from '@/config/menu.acadia';
import type { AcadiaMenuConfig } from '@/config/types';
import { ACADIA_DEMO_REDIRECTS } from '@/lib/acadia/demo-routes';

const MENU_ROLES = [
  'admin',
  'teacher',
  'bursar',
  'financial-director',
  'student',
  'guardian',
  'parent',
] as const;

/** Header / account-chrome links that must resolve after Metronic leftovers were retargeted. */
const LIVE_CHROME_HREFS = [
  '/user-management/account/security',
  '/finance/fees',
  '/admin/users',
  '/account/home/settings-sidebar',
  '/account/home/user-profile',
  '/account/home/get-started',
  '/account/notifications',
  '/reports/templates',
  '/reports',
];

function collectMenuPaths(items: AcadiaMenuConfig): string[] {
  const paths: string[] = [];
  for (const item of items) {
    if (item.path) {
      paths.push(item.path.split('?')[0] ?? item.path);
    }
    if (item.children) {
      paths.push(...collectMenuPaths(item.children));
    }
  }
  return [...new Set(paths)];
}

function collectPageRoutes(appDir: string): Set<string> {
  const routes = new Set<string>();

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        continue;
      }
      const rel = full.replace(/\\/g, '/').split('/app/')[1];
      if (!rel) continue;
      const withoutGroups = rel.replace(/\([^/]+\)\//g, '');
      const route = `/${withoutGroups.replace(/\/page\.(tsx|ts|jsx|js)$/, '')}`
        .replace(/\/page\.(tsx|ts|jsx|js)$/, '')
        .replace(/\/$/, '');
      routes.add(route === '' || route === '/' ? '/' : route);
    }
  };

  walk(appDir);
  return routes;
}

function redirectCovers(pathname: string): boolean {
  return ACADIA_DEMO_REDIRECTS.some((entry) => {
    if (entry.source.endsWith('/:path*')) {
      const prefix = entry.source.slice(0, -'/:path*'.length);
      return pathname === prefix || pathname.startsWith(`${prefix}/`);
    }
    return entry.source === pathname;
  });
}

describe('menu and chrome routes have pages', () => {
  const pageRoutes = collectPageRoutes(join(process.cwd(), 'app'));

  it('maps every getMenuForRole path to an App Router page', () => {
    const missing: string[] = [];
    for (const role of MENU_ROLES) {
      for (const path of collectMenuPaths(getMenuForRole(role))) {
        if (!pageRoutes.has(path)) {
          missing.push(`${role}: ${path}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('resolves live header hrefs to a page or demo redirect', () => {
    const missing = LIVE_CHROME_HREFS.filter(
      (href) => !pageRoutes.has(href) && !redirectCovers(href),
    );
    expect(missing).toEqual([]);
  });

  it('includes the report card templates page under /reports/templates', () => {
    expect(pageRoutes.has('/reports/templates')).toBe(true);
    expect(pageRoutes.has('/reports')).toBe(true);
  });

  it('maps parent to the guardian menu without Students', () => {
    const parentPaths = collectMenuPaths(getMenuForRole('parent'));
    const guardianPaths = collectMenuPaths(getMenuForRole('guardian'));
    expect(parentPaths).toEqual(guardianPaths);
    expect(parentPaths).not.toContain('/students');
  });

  it('includes Grade reports under Marks for teachers', () => {
    const teacherPaths = collectMenuPaths(getMenuForRole('teacher'));
    expect(teacherPaths).toContain('/marks/reports');
    expect(teacherPaths).toContain('/marks/entry');
  });

  it('hides Users, Roles, and Logs from bursar', () => {
    const bursarPaths = collectMenuPaths(getMenuForRole('bursar'));
    expect(bursarPaths).toContain('/user-management/account/security');
    expect(bursarPaths).not.toContain('/admin/users');
    expect(bursarPaths).not.toContain('/admin/roles');
    expect(bursarPaths).not.toContain('/admin/logs');
    expect(bursarPaths).not.toContain('/admin/data-retention');
    expect(bursarPaths).not.toContain('/account/api-keys');
    expect(bursarPaths).not.toContain('/account/home/get-started');
    expect(bursarPaths).not.toContain('/account/home/settings-sidebar');
  });

  it('adds Security to every role My Account menu', () => {
    for (const role of MENU_ROLES) {
      expect(collectMenuPaths(getMenuForRole(role))).toContain(
        '/user-management/account/security',
      );
    }
  });

  it('keeps API keys under Administration, not My Account', () => {
    const admin = getMenuForRole('admin');
    const myAccount = admin.find((item) => item.titleKey === 'nav.myAccount');
    const myAccountPaths = collectMenuPaths(myAccount ? [myAccount] : []);
    expect(myAccountPaths).not.toContain('/account/api-keys');
    expect(collectMenuPaths(admin)).toContain('/account/api-keys');
    expect(collectMenuPaths(getMenuForRole('financial-director'))).toContain(
      '/admin/data-retention',
    );
  });

  it('does not give bursar the full admin My Account', () => {
    const bursar = collectMenuPaths(getMenuForRole('bursar'));
    const admin = collectMenuPaths(getMenuForRole('admin'));
    expect(bursar).not.toContain('/academics/years');
    expect(admin).toContain('/academics/years');
  });

  it('hides Institution, Settings, and API keys from students', () => {
    const student = collectMenuPaths(getMenuForRole('student'));
    expect(student).toContain('/account/home/user-profile');
    expect(student).toContain('/user-management/account/security');
    expect(student).toContain('/account/notifications');
    expect(student).not.toContain('/account/home/company-profile');
    expect(student).not.toContain('/account/home/settings-sidebar');
    expect(student).not.toContain('/account/api-keys');
    expect(student).not.toContain('/admin/users');
  });

  it('keeps Groups off student and guardian menus', () => {
    expect(collectMenuPaths(getMenuForRole('student'))).not.toContain(
      '/messages/groups',
    );
    expect(collectMenuPaths(getMenuForRole('guardian'))).not.toContain(
      '/messages/groups',
    );
    expect(collectMenuPaths(getMenuForRole('teacher'))).toContain(
      '/messages/groups',
    );
    expect(collectMenuPaths(getMenuForRole('admin'))).toContain(
      '/messages/groups',
    );
  });
});
