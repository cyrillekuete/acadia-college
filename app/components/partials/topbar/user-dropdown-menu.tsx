import { ReactNode } from 'react';
import Link from 'next/link';
import {
  Bell,
  Building2,
  FileText,
  Globe,
  Moon,
  Settings,
  Shield,
  Sparkles,
  User,
} from 'lucide-react';
import { I18N_LANGUAGES, Language } from '@/i18n/config';
import { useTheme } from 'next-themes';
import { UserAvatar } from '@/components/acadia/account/user-avatar';
import { getMenuForRole } from '@/config/menu.acadia';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useAcadiaSignOut } from '@/hooks/use-acadia-sign-out';
import { menuItemLabel } from '@/lib/acadia/menu-label';
import { useLanguage } from '@/providers/i18n-provider';
import { useTranslation } from '@/hooks/useTranslation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

const ACCOUNT_ITEM_ICONS: Record<string, typeof User> = {
  '/account/home/user-profile': User,
  '/user-management/account/security': Shield,
  '/account/notifications': Bell,
  '/account/home/company-profile': Building2,
  '/account/home/settings-sidebar': Settings,
  '/account/home/get-started': Sparkles,
};

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  const { data: acadiaSession } = useAcadiaCollegeSession();
  const signOut = useAcadiaSignOut();
  const { changeLanguage, language } = useLanguage();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const displayName =
    acadiaSession?.profile?.name ??
    acadiaSession?.authUser?.email?.split('@')[0] ??
    '';
  const displayEmail =
    acadiaSession?.profile?.email ?? acadiaSession?.authUser?.email ?? '';
  const roleName = acadiaSession?.profile?.UserRole?.name;

  const myAccount = getMenuForRole(acadiaSession?.roleSlug).find(
    (item) => item.titleKey === 'nav.myAccount',
  );
  const accountLinks = myAccount?.children ?? [];

  const handleLanguage = (lang: Language) => {
    changeLanguage(lang.code);
  };

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" side="bottom" align="end">
        <div className="flex items-center gap-2 p-3">
          <UserAvatar
            name={displayName}
            email={displayEmail}
            avatar={acadiaSession?.profile?.avatar}
          />
          <div className="flex min-w-0 flex-col">
            <Link
              href="/account/home/user-profile"
              className="truncate text-sm font-semibold text-mono hover:text-primary"
            >
              {displayName || displayEmail}
            </Link>
            {displayEmail ? (
              <span className="truncate text-xs text-muted-foreground">
                {displayEmail}
              </span>
            ) : null}
            {roleName ? (
              <span className="truncate text-xs text-muted-foreground">
                {roleName}
              </span>
            ) : null}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2">
            <Settings />
            {t('nav.myAccount')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            {accountLinks.map((item) => {
              if (!item.path) {
                return null;
              }
              const Icon = ACCOUNT_ITEM_ICONS[item.path] ?? FileText;
              return (
                <DropdownMenuItem key={item.path} asChild>
                  <Link href={item.path} className="flex items-center gap-2">
                    <Icon />
                    {menuItemLabel(item, t)}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2 [&_[data-slot=dropdown-menu-sub-trigger-indicator]]:hidden hover:[&_[data-slot=badge]]:border-input data-[state=open]:[&_[data-slot=badge]]:border-input">
            <Globe />
            <span className="flex items-center justify-between gap-2 grow relative">
              {t('account.language')}
              <Badge
                variant="outline"
                className="absolute end-0 top-1/2 -translate-y-1/2"
              >
                {language.name}
                <img
                  src={language.flag}
                  className="w-3.5 h-3.5 rounded-full"
                  alt={language.name}
                />
              </Badge>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuRadioGroup
              value={language.code}
              onValueChange={(value) => {
                const selectedLang = I18N_LANGUAGES.find(
                  (lang) => lang.code === value,
                );
                if (selectedLang) handleLanguage(selectedLang);
              }}
            >
              {I18N_LANGUAGES.map((item) => (
                <DropdownMenuRadioItem
                  key={item.code}
                  value={item.code}
                  className="flex items-center gap-2"
                >
                  <img
                    src={item.flag}
                    className="w-4 h-4 rounded-full"
                    alt={item.name}
                  />
                  <span>{item.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center gap-2"
          onSelect={(event) => event.preventDefault()}
        >
          <Moon />
          <div className="flex items-center gap-2 justify-between grow">
            {t('account.darkMode', { defaultValue: 'Dark mode' })}
            <Switch
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeToggle}
            />
          </div>
        </DropdownMenuItem>
        <div className="p-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => void signOut()}
          >
            {t('common.buttons.signOut')}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
