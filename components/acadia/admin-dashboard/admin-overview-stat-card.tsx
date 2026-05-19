'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AdminOverviewStatCard({
  title,
  value,
  footer,
  footerTone = 'muted',
  icon: Icon,
}: {
  title: string;
  value: string | number;
  footer: string;
  footerTone?: 'positive' | 'muted';
  icon: LucideIcon;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <StatIconBadge Icon={Icon} />
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

function StatIconBadge({ Icon }: { Icon: LucideIcon }) {
  return (
    <div className="flex size-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
      <Icon className="size-4" aria-hidden />
    </div>
  );
}
