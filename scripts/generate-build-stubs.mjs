import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const stubComponent = (name) => `'use client';

import { ReactNode } from 'react';

export function ${name}(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  const { children, className } = props;
  return <div className={className}>{children}</motion.div>;
}

export default ${name};
`;

const stubHook = (name) => `'use client';

export function ${name}() {
  return { data: [], isLoading: false, error: null };
}

export default ${name};
`;

const files = [
  // partials/common
  ['app/components/partials/common/engage.tsx', 'Engage'],
  ['app/components/partials/common/faq.tsx', 'Faq'],
  ['app/components/partials/common/help.tsx', 'Help'],
  ['app/components/partials/common/help2.tsx', 'Help2'],
  ['app/components/partials/common/avatar-group.tsx', 'AvatarGroup'],
  ['app/components/partials/common/user-hero.tsx', 'UserHero'],
  ['app/components/partials/common/create-team.tsx', 'CreateTeam'],
  ['app/components/partials/common/highlighted-posts.tsx', 'HighlightedPosts'],
  ['app/components/partials/common/starter.tsx', 'Starter'],
  ['app/components/partials/common/hexagon-badge.tsx', 'HexagonBadge'],
  ['app/components/partials/common/rating.tsx', 'Rating'],
  // partials/cards
  ['app/components/partials/cards/card-role.tsx', 'CardRole'],
  ['app/components/partials/cards/card-ntf.tsx', 'CardNtf'],
  ['app/components/partials/cards/card-ntf2.tsx', 'CardNtf2'],
  ['app/components/partials/cards/card-add-new.tsx', 'CardAddNew'],
  ['app/components/partials/cards/card-author.tsx', 'CardAuthor'],
  ['app/components/partials/cards/card-work-row.tsx', 'CardWorkRow'],
  ['app/components/partials/cards/card-work.tsx', 'CardWork'],
  ['app/components/partials/cards/card-now-playing.tsx', 'CardNowPlaying'],
  ['app/components/partials/cards/card-tournament.tsx', 'CardTournament'],
  ['app/components/partials/cards/card-team-row.tsx', 'CardTeamRow'],
  ['app/components/partials/cards/card-team.tsx', 'CardTeam'],
  ['app/components/partials/cards/card-post.tsx', 'CardPost'],
  ['app/components/partials/cards/card-connection-row.tsx', 'CardConnectionRow'],
  ['app/components/partials/cards/card-connection.tsx', 'CardConnection'],
  // mega-menu
  ['app/components/partials/mega-menu/mega-menu-sub-account.tsx', 'MegaMenuSubAccount'],
  ['app/components/partials/mega-menu/mega-menu-sub-auth.tsx', 'MegaMenuSubAuth'],
  ['app/components/partials/mega-menu/mega-menu-sub-network.tsx', 'MegaMenuSubNetwork'],
  ['app/components/partials/mega-menu/mega-menu-sub-profiles.tsx', 'MegaMenuSubProfiles'],
  ['app/components/partials/mega-menu/mega-menu-sub-store.tsx', 'MegaMenuSubStore'],
  // navbar
  ['app/components/partials/navbar/navbar-menu.tsx', 'NavbarMenu'],
  ['app/components/partials/navbar/navbar.tsx', 'Navbar'],
  // dropdown-menus
  ['app/components/partials/dropdown-menus/dropdown-menu-2.tsx', 'DropdownMenu2'],
  ['app/components/partials/dropdown-menus/dropdown-menu-3.tsx', 'DropdownMenu3'],
  ['app/components/partials/dropdown-menus/dropdown-menu-4.tsx', 'DropdownMenu4'],
  ['app/components/partials/dropdown-menus/dropdown-menu-5.tsx', 'DropdownMenu5'],
  ['app/components/partials/dropdown-menus/dropdown-menu-6.tsx', 'DropdownMenu6'],
  ['app/components/partials/dropdown-menus/dropdown-menu-7.tsx', 'DropdownMenu7'],
  ['app/components/partials/dropdown-menus/dropdown-menu-8.tsx', 'DropdownMenu8'],
  ['app/components/partials/dropdown-menus/dropdown-menu-9.tsx', 'DropdownMenu9'],
  // roles hook
  [
    'app/(protected)/user-management/roles/hooks/use-role-select-query.ts',
    null,
    'hook',
    'useRoleSelectQuery',
  ],
  // store-client
  [
    'app/(protected)/store-client/home/components/store-client-content.tsx',
    'StoreClientContent',
  ],
  [
    'app/(protected)/store-client/search-results-grid/components/search-results-grid-content.tsx',
    'SearchResultsGridContent',
  ],
  [
    'app/(protected)/store-client/search-results-list/components/search-results-list-content.tsx',
    'SearchResultsListContent',
  ],
  [
    'app/(protected)/store-client/product-details/content.tsx',
    'ProductDetailsContent',
  ],
  [
    'app/(protected)/store-client/wishlist/content.tsx',
    'WishlistContent',
  ],
  [
    'app/(protected)/store-client/checkout/shipping-info/components/shipping-info-content.tsx',
    'ShippingInfoContent',
  ],
  [
    'app/(protected)/store-client/checkout/payment-method/components/payment-method-content.tsx',
    'PaymentMethodContent',
  ],
  [
    'app/(protected)/store-client/checkout/order-placed/components/order-placed-content.tsx',
    'OrderPlacedContent',
  ],
  [
    'app/(protected)/store-client/checkout/order-summary/components/order-summary-content.tsx',
    'OrderSummaryContent',
  ],
  [
    'app/(protected)/store-client/my-orders/content.tsx',
    'MyOrdersContent',
  ],
  // store-admin
  [
    'app/(protected)/store-admin/dashboard/components/dashboard-content.tsx',
    'DashboardContent',
  ],
  [
    'app/(protected)/store-admin/inventory/all-products/components/all-products-content.tsx',
    'AllProductsContent',
  ],
  // dark-sidebar demo
  [
    'app/(protected)/dark-sidebar/page.tsx',
    null,
    'page',
  ],
];

function fixStubContent(content) {
  return content.replace(/<\/motion\.motion.div>/g, '</div>').replace(/<motion\.div/g, '<motion.div');
}

for (const entry of files) {
  const [relPath, exportName, type = 'component', hookName] = entry;
  const fullPath = path.join(root, relPath);
  if (fs.existsSync(fullPath) && type !== 'page') continue;

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  if (type === 'hook') {
    fs.writeFileSync(fullPath, stubHook(hookName || exportName));
    console.log('hook', relPath);
    continue;
  }

  if (type === 'page') {
    fs.writeFileSync(
      fullPath,
      `'use client';

import { Container } from '@/components/common/container';

export default function DarkSidebarPage() {
  return (
    <Container>
      <p className="text-muted-foreground">Dark sidebar demo placeholder.</p>
    </Container>
  );
}
`,
    );
    console.log('page', relPath);
    continue;
  }

  let content = stubComponent(exportName);
  content = content.replace(/<\/motion\.motion.div>/g, '</div>');
  content = content.replace(/<motion\.motion.div/g, '<motion.div');
  content = content.replace(/return <motion\.div/g, 'return <motion.div');
  content = content.replace(/<motion\.div className=\{className\}>\{children\}<\/motion\.motion.div>/, '<div className={className}>{children}</div>');
  content = content.replace(/return <motion\.div className=\{className\}>\{children\}<\/motion\.div>/, 'return <div className={className}>{children}</div>');
  // fix the broken template
  content = `'use client';

import { ReactNode } from 'react';

export function ${exportName}(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  const { children, className } = props;
  return <div className={className}>{children}</div>;
}

export default ${exportName};
`;

  fs.writeFileSync(fullPath, content);
  console.log('component', relPath);
}

// Fix toolbar if broken
const toolbarPath = path.join(root, 'app/components/partials/common/toolbar.tsx');
const toolbarFixed = `'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Toolbar = ({ children }: { children?: ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-5 pb-7.5">{children}</div>
);

export const ToolbarActions = ({ children }: { children?: ReactNode }) => (
  <div className="flex items-center gap-2.5">{children}</div>
);

export const ToolbarHeading = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <div className={cn('flex flex-col gap-1', className)}>{children}</motion.div>
);

export const ToolbarPageTitle = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <h1 className={cn('text-xl font-medium text-foreground', className)}>{children}</h1>
);

export const ToolbarDescription = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>
);
`.replace(/<\/motion\.div>/g, '</motion.div>').replace(/<\/motion\.div>/g, '</div>').replace(/<\/motion\.div>/g, '</div>');

// simpler toolbar write
fs.writeFileSync(
  toolbarPath,
  `'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Toolbar = ({ children }: { children?: ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-5 pb-7.5">{children}</div>
);

export const ToolbarActions = ({ children }: { children?: ReactNode }) => (
  <div className="flex items-center gap-2.5">{children}</div>
);

export const ToolbarHeading = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <div className={cn('flex flex-col gap-1', className)}>{children}</div>
);

export const ToolbarPageTitle = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <h1 className={cn('text-xl font-medium text-foreground', className)}>{children}</h1>
);

export const ToolbarDescription = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>
);
`,
);

console.log('Done');
