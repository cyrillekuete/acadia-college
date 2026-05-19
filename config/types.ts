import { type LucideIcon } from 'lucide-react';
import type { KeenIconName } from '@/lib/icons/keen-icon-names';

export interface MenuItem {
  title?: string;
  icon?: LucideIcon;
  path?: string;
  rootPath?: string;
  childrenIndex?: number;
  heading?: string;
  children?: MenuConfig;
  disabled?: boolean;
  collapse?: boolean;
  collapseTitle?: string;
  expandTitle?: string;
  badge?: string;
  separator?: boolean;
}

export type MenuConfig = MenuItem[];

/** Acadia role-based sidebar navigation (Keenicons duotone glyph names). */
export interface AcadiaMenuItem {
  title?: string;
  icon?: KeenIconName;
  path?: string;
  rootPath?: string;
  childrenIndex?: number;
  heading?: string;
  children?: AcadiaMenuConfig;
  disabled?: boolean;
  collapse?: boolean;
  collapseTitle?: string;
  expandTitle?: string;
  badge?: string;
  separator?: boolean;
}

export type AcadiaMenuConfig = AcadiaMenuItem[];

export interface Settings {
  container: 'fixed' | 'fluid';
  layout: string;
  layouts: {
    demo1: {
      sidebarCollapse: boolean;
      sidebarTheme: 'light' | 'dark';
    };
    demo2: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
    demo5: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
    demo7: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
    demo9: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
  };
}
