'use client';

import { BookOpen, FileText, LogIn, MoreHorizontal } from '@/lib/icons';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { timeAgo } from '@/lib/helpers';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchAdminRecentActivities,
  type AdminActivityItem,
} from '@/lib/supabase/queries/admin-dashboard';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { cn } from '@/lib/utils';

const CATEGORY_STYLES: Record<
  AdminActivityItem['category'],
  { icon: typeof LogIn; iconClass: string; bgClass: string }
> = {
  auth: {
    icon: LogIn,
    iconClass: 'text-emerald-600',
    bgClass: 'bg-emerald-500/10',
  },
  academic: {
    icon: BookOpen,
    iconClass: 'text-blue-600',
    bgClass: 'bg-blue-500/10',
  },
  report: {
    icon: FileText,
    iconClass: 'text-violet-600',
    bgClass: 'bg-violet-500/10',
  },
  general: {
    icon: MoreHorizontal,
    iconClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
  },
};

export function AdminRecentActivities() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['admin-dashboard-activities', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant context is required');
      const supabase = requireBrowserClient();
      return fetchAdminRecentActivities(supabase, tenantId);
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent>
        {activitiesLoading ? (
          <p className="text-sm text-muted-foreground">Loading activities…</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {activities.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityRow({ item }: { item: AdminActivityItem }) {
  const style = CATEGORY_STYLES[item.category];
  const Icon = style.icon;

  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          style.bgClass,
        )}
      >
        <Icon className={cn('size-4', style.iconClass)} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </div>
      <time
        className="shrink-0 text-xs text-muted-foreground"
        dateTime={item.createdAt}
      >
        {timeAgo(item.createdAt)}
      </time>
    </li>
  );
}
