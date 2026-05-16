'use client';

import { toAbsoluteUrl } from '@/lib/helpers';
import { getTenantAssetPublicUrl } from '@/lib/supabase/storage';
import { useAcadiaTenant } from '@/hooks/use-acadia-tenant';
import { cn } from '@/lib/utils';

type TenantLogoProps = {
  variant?: 'default' | 'mini';
  className?: string;
  alt?: string;
};

const FALLBACK = {
  default: {
    light: '/media/app/default-logo.svg',
    dark: '/media/app/default-logo-dark.svg',
  },
  mini: {
    light: '/media/app/mini-logo.svg',
    dark: '/media/app/mini-logo.svg',
  },
} as const;

export function TenantLogo({
  variant = 'default',
  className,
  alt,
}: TenantLogoProps) {
  const { data: tenant } = useAcadiaTenant();
  const customUrl = getTenantAssetPublicUrl(tenant?.logoStorageKey);
  const label = alt ?? tenant?.displayNameEn ?? 'Acadia College';

  if (customUrl) {
    return (
      <img
        src={customUrl}
        className={cn('h-[22px] max-w-none object-contain object-left', className)}
        alt={label}
      />
    );
  }

  const paths = FALLBACK[variant];

  return (
    <>
      <img
        src={toAbsoluteUrl(paths.light)}
        className={cn(
          'dark:hidden',
          variant === 'mini' ? 'small-logo' : 'default-logo',
          'h-[22px] max-w-none',
          className,
        )}
        alt={label}
      />
      <img
        src={toAbsoluteUrl(paths.dark)}
        className={cn(
          'hidden dark:block',
          variant === 'mini' ? 'small-logo' : 'default-logo',
          'h-[22px] max-w-none',
          className,
        )}
        alt={label}
      />
    </>
  );
}
