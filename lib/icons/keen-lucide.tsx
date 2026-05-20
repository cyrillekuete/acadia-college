'use client';

import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { KeenIcon } from '@/components/keenicons';
import { DEFAULT_KEENICONS_STYLE } from '@/components/keenicons/types';
import { cn } from '@/lib/utils';
import type { KeenIconName } from './keen-icon-names';
import { LUCIDE_TO_KEEN, type LucideExportName } from './lucide-to-keen';

export function keenLucide(name: KeenIconName): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
    ({ className, 'aria-hidden': ariaHidden, ..._props }, ref) => (
      <KeenIcon
        ref={ref as React.Ref<HTMLElement>}
        icon={name}
        style={DEFAULT_KEENICONS_STYLE}
        className={cn('inline-flex shrink-0 leading-none', className)}
        aria-hidden={ariaHidden ?? true}
      />
    ),
  );
  Icon.displayName = `KeenIcon(${name})`;
  return Icon as LucideIcon;
}

export function lucideToKeenIcon(lucideName: LucideExportName): LucideIcon {
  return keenLucide(LUCIDE_TO_KEEN[lucideName]);
}
