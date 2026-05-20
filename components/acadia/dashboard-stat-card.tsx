'use client';

import { KeenIcon } from '@/components/keenicons';
import type { KeenIconName } from '@/lib/icons';
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
  icon,
}: {
  title: string;
  value: number | string;
  icon: KeenIconName;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeenIcon icon={icon} className="text-2xl" aria-hidden />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
