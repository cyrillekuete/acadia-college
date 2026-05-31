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
  { source: '/account/integrations', destination: '/account/home/get-started', permanent: false },
  { source: '/account/invite-a-friend', destination: '/account/home/get-started', permanent: false },
  { source: '/account/appearance', destination: '/account/home/settings-sidebar', permanent: false },
  { source: '/account/home/settings-plain', destination: '/account/home/settings-sidebar', permanent: false },
  { source: '/account/home/settings-modal', destination: '/account/home/settings-sidebar', permanent: false },
  { source: '/account/home/settings-enterprise', destination: '/account/home/settings-sidebar', permanent: false },
  { source: '/network/:path*', destination: '/', permanent: false },
  { source: '/user-management/users/:path*', destination: '/admin/users', permanent: false },
  { source: '/user-management/roles/:path*', destination: '/admin/roles', permanent: false },
  { source: '/user-management/permissions/:path*', destination: '/admin/roles', permanent: false },
  { source: '/user-management/settings/:path*', destination: '/account/home/settings-sidebar', permanent: false },
];

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
