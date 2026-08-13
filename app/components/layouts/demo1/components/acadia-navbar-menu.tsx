'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getNavbarQuickLinksForRole } from '@/config/menu.acadia';
import type { AcadiaMenuItem, MenuItem } from '@/config/types';
import { cn } from '@/lib/utils';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useMenu } from '@/hooks/use-menu';
import { useTranslation } from '@/hooks/useTranslation';
import { menuItemLabel } from '@/lib/acadia/menu-label';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

const linkClass = `
  text-sm text-secondary-foreground font-medium 
  hover:text-primary hover:bg-transparent 
  focus:text-primary focus:bg-transparent 
  data-[active=true]:text-primary data-[active=true]:bg-transparent 
  data-[state=open]:text-primary data-[state=open]:bg-transparent
`;

function QuickLinkDropdown({ item }: { item: AcadiaMenuItem }) {
  const pathname = usePathname();
  const { hasActiveChild } = useMenu(pathname);
  const { t } = useTranslation();

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger
        className={cn(linkClass)}
        data-active={
          hasActiveChild(item.children as MenuItem[] | undefined) || undefined
        }
      >
        {menuItemLabel(item, t)}
      </NavigationMenuTrigger>
      <NavigationMenuContent className="min-w-[12rem] p-1">
        <ul className="flex flex-col gap-0.5">
          {item.children?.map((child) => (
            <li key={child.path ?? child.titleKey ?? child.title}>
              <NavigationMenuLink asChild>
                <Link
                  href={child.path ?? '#'}
                  className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {menuItemLabel(child, t)}
                </Link>
              </NavigationMenuLink>
            </li>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function QuickLinkDirect({ item }: { item: AcadiaMenuItem }) {
  const pathname = usePathname();
  const { isActive } = useMenu(pathname);
  const { t } = useTranslation();

  return (
    <NavigationMenuItem>
      <NavigationMenuLink asChild>
        <Link
          href={item.path ?? '/'}
          className={cn(linkClass)}
          data-active={isActive(item.path) || undefined}
        >
          {menuItemLabel(item, t)}
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

export function AcadiaNavbarMenu() {
  const pathname = usePathname();
  const { isActive } = useMenu(pathname);
  const { data: session } = useAcadiaCollegeSession();
  const { t } = useTranslation();
  const quickLinks = getNavbarQuickLinksForRole(session?.roleSlug);

  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList className="gap-0">
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link
              href="/"
              className={cn(linkClass)}
              data-active={isActive('/') || undefined}
            >
              {t('nav.home')}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        {quickLinks.map((item) =>
          item.children && item.children.length > 0 ? (
            <QuickLinkDropdown key={item.titleKey ?? item.title} item={item} />
          ) : (
            <QuickLinkDirect key={item.titleKey ?? item.title} item={item} />
          ),
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
