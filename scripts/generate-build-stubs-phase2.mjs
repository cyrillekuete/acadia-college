import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

function write(rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  console.log('wrote', rel);
}

const stub = (name) => `'use client';
import { ReactNode } from 'react';
export function ${name}(props: { children?: ReactNode; className?: string; trigger?: ReactNode; [key: string]: unknown }) {
  const { children, className, trigger } = props;
  return <>{trigger}<motion.div className={className}>{children}</motion.div></>;
}
export default ${name};
`.replace(/<motion\.div/g, '<div').replace(/<\/motion\.motion.div>/g, '</motion.div>').replace(/<\/motion\.motion.div>/g, '</div>');

// dropdown-menu (singular path)
for (const n of [2, 3, 4, 5, 6, 9]) {
  write(`app/components/partials/dropdown-menu/dropdown-menu-${n}.tsx`, stub(`DropdownMenu${n}`));
}

write(
  'app/components/partials/cards/index.ts',
  `export { CardAddNew } from './card-add-new';
export { CardRole } from './card-role';
export { CardIntegration } from './card-integration';
export { CardNotification } from './card-notification';
`,
);

write(
  'app/components/partials/cards/card-integration.tsx',
  stub('CardIntegration'),
);
write(
  'app/components/partials/cards/card-notification.tsx',
  stub('CardNotification'),
);

write(
  'app/components/partials/common/avatar-input.tsx',
  `'use client';
import { ReactNode } from 'react';
export function AvatarInput(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  return <div className={props.className}>{props.children}</motion.div>;
}
`.replace(/<\/motion\.div>/, '</motion.div>').replace(/<\/motion\.motion.div>/, '</div>').replace(/return <div[^]+<\/motion\.div>/, 'return <motion.div className={props.className}>{props.children}</motion.div>'),
);

// Fix avatar-input properly
write(
  'app/components/partials/common/avatar-input.tsx',
  `'use client';
import { ReactNode } from 'react';
export function AvatarInput(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  return <div className={props.className}>{props.children}</div>;
}
`,
);

write(
  'app/components/partials/common/highlighted-posts.tsx',
  `'use client';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export type HighlightedPostsItems = Array<{
  icon?: LucideIcon;
  title?: string;
  summary?: string;
  path?: string;
  [key: string]: unknown;
}>;

export function HighlightedPosts(props: { posts?: HighlightedPostsItems; children?: ReactNode; className?: string }) {
  return <div className={props.className}>{props.children}</div>;
}

export { HighlightedPostsItems as type };
`,
);

write(
  'app/components/partials/common/avatar-group.tsx',
  `'use client';
import { ReactNode } from 'react';

export function AvatarGroup(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  return <div className={props.className}>{props.children}</div>;
}

export function Avatar(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  return <span className={props.className}>{props.children}</span>;
}

export function Avatars(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  return <div className={props.className}>{props.children}</div>;
}
`,
);

write(
  'app/components/partials/navbar/scrollspy-menu.tsx',
  `'use client';
import { ReactNode } from 'react';

export type ScrollspyMenuItems = Array<{
  title: string;
  target?: string;
  active?: boolean;
  children?: ScrollspyMenuItems;
}>;

export function ScrollspyMenu(props: { items?: ScrollspyMenuItems; children?: ReactNode; className?: string }) {
  return <nav className={props.className}>{props.children}</nav>;
}
`,
);

write(
  'app/components/partials/dialogs/search/search-dialog.tsx',
  `'use client';
export function SearchDialog() {
  return null;
}
`,
);

write(`app/components/partials/mega-menu/mega-menu-sub-apps.tsx`, stub('MegaMenuSubApps'));

// App-relative imports
write(
  'app/(protected)/account/security/overview/components/trusted-devices.tsx',
  stub('TrustedDevices'),
);
write(
  'app/(protected)/store-admin/components/create-shipping-label-sheet/sheet.tsx',
  `'use client';
export function CreateShippingLabelSheet() { return null; }
export default CreateShippingLabelSheet;
`,
);
write(
  'app/(protected)/store-admin/components/track-shipping-sheet.tsx',
  `'use client';
export function TrackShippingSheet() { return null; }
export default TrackShippingSheet;
`,
);
write(
  'app/(protected)/store-client/search-results-grid/components/search-results.tsx',
  stub('SearchResults'),
);

// Missing store-client content files from phase 1
for (const [rel, name] of [
  ['app/(protected)/store-client/product-details/content.tsx', 'ProductDetailsContent'],
  ['app/(protected)/store-client/wishlist/content.tsx', 'WishlistContent'],
  ['app/(protected)/store-client/my-orders/content.tsx', 'MyOrdersContent'],
]) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) write(rel, stub(name));
}

console.log('Phase 2 done');
