'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const STAT_PLACEHOLDER = '—';

/** Preserves `0`; only uses the em-dash while the count is still loading (`undefined`/`null`). */
export function formatDashboardStatValue(
  value: number | null | undefined,
): number | string {
  if (value === null || value === undefined) {
    return STAT_PLACEHOLDER;
  }
  return value;
}

export function DashboardStatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
