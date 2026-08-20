/**
 * Metronic demo routes redirected to Acadia equivalents (P9-40).
 * Consumed by next.config.mjs redirects().
 */
export type AcadiaDemoRedirect = {
  source: string;
  destination: string;
  permanent: boolean;
};

export const ACADIA_DEMO_REDIRECTS: AcadiaDemoRedirect[] = [
  { source: '/store-client/:path*', destination: '/', permanent: false },
  { source: '/account/billing/:path*', destination: '/finance/fees', permanent: false },
  { source: '/account/members/:path*', destination: '/admin/users', permanent: false },
  { source: '/account/security', destination: '/user-management/account/security', permanent: false },
  { source: '/account/security/:path*', destination: '/user-management/account/security', permanent: false },
  { source: '/user/users', destination: '/admin/users', permanent: false },
  { source: '/alerts', destination: '/announcements', permanent: false },
  { source: '/alerts/:path*', destination: '/announcements', permanent: false },
  { source: '/announcements/new', destination: '/announcements', permanent: false },
  { source: '/announcements/events', destination: '/announcements', permanent: false },
  { source: '/account/integrations', destination: '/account/home/get-started', permanent: false },
  { source: '/account/invite-a-friend', destination: '/account/home/get-started', permanent: false },
  { source: '/account/appearance', destination: '/account/home/settings-sidebar', permanent: false },
  { source: '/account/home/settings-plain', destination: '/account/home/settings-sidebar', permanent: false },
  { source: '/account/home/settings-modal', destination: '/account/home/settings-sidebar', permanent: false },
  { source: '/account/home/settings-enterprise', destination: '/account/home/settings-sidebar', permanent: false },
  { source: '/network/:path*', destination: '/', permanent: false },
  { source: '/user-management/users', destination: '/admin/users', permanent: false },
  { source: '/user-management/users/:path*', destination: '/admin/users', permanent: false },
  { source: '/user-management/roles', destination: '/admin/roles', permanent: false },
  { source: '/user-management/roles/:path*', destination: '/admin/roles', permanent: false },
  { source: '/user-management/permissions', destination: '/admin/roles', permanent: false },
  { source: '/user-management/permissions/:path*', destination: '/admin/roles', permanent: false },
  { source: '/user-management/settings', destination: '/account/home/settings-sidebar', permanent: false },
  { source: '/user-management/settings/:path*', destination: '/account/home/settings-sidebar', permanent: false },
  { source: '/user-management/logs', destination: '/admin/logs', permanent: false },
  { source: '/user-management/logs/:path*', destination: '/admin/logs', permanent: false },
];

const METRONIC_DEMO_LAYOUTS = [
  'demo1',
  'demo2',
  'demo3',
  'demo4',
  'demo5',
  'demo6',
  'demo7',
  'demo8',
  'demo9',
  'demo10',
] as const;

/** Metronic layout prefixes (`/demo5/reports/term` → `/reports/term`). */
export const ACADIA_DEMO_LAYOUT_REDIRECTS: AcadiaDemoRedirect[] =
  METRONIC_DEMO_LAYOUTS.flatMap((demo) => [
    { source: `/${demo}`, destination: '/', permanent: false },
    { source: `/${demo}/:path*`, destination: '/:path*', permanent: false },
  ]);

/** Prefixes blocked from Acadia navigation (documentation / tests). */
export const ACADIA_DEMO_ROUTE_PREFIXES = [
  '/store-client',
  '/account/billing',
  '/account/members',
  '/network',
] as const;

export function isAcadiaDemoRoute(pathname: string): boolean {
  return ACADIA_DEMO_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
