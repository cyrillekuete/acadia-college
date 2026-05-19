'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
export function DashboardChannelStatCard({
  title,
  value,
  icon: Icon,
  className,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn('h-full', className)}>
      <CardContent
        data-slot="card-content"
        className={cn(
          'channel-stats-bg grow p-0 flex h-full min-h-36 flex-col justify-between gap-6',
          'bg-cover bg-[right_top_-1.7rem] bg-no-repeat rtl:bg-[left_top_-1.7rem]',
        )}
      >
        <Icon className="mt-4 ms-5 size-7 text-primary" aria-hidden />
        <div className="flex flex-col gap-1 px-5 pb-4">
          <span className="text-3xl font-semibold text-mono">{value}</span>
          <span className="text-sm font-normal text-muted-foreground">{title}</span>
        </div>
      </CardContent>
    </Card>
  );
}
