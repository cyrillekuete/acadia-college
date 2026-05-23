'use client';

import { KeenIcon } from '@/components/keenicons';
import type { KeenIconName } from '@/lib/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AdminOverviewStatCard({
  title,
  value,
  footer,
  footerTone = 'muted',
  icon,
}: {
  title: string;
  value: string | number;
  footer: string;
  footerTone?: 'positive' | 'muted';
  icon: KeenIconName;
}) {
  return (
    <Card className="h-full text-center">
      <CardHeader className="space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <StatIconBadge icon={icon} />
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p
          className={cn(
            'text-xs',
            footerTone === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )}
        >
          {footer}
        </p>
      </CardContent>
    </Card>
  );
}

function StatIconBadge({ icon }: { icon: KeenIconName }) {
  return (
    <div className="flex size-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
      <KeenIcon icon={icon} className="text-base" aria-hidden />
    </div>
  );
}
