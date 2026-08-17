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
});
