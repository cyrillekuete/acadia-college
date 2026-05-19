'use client';

import { useQuery } from '@tanstack/react-query';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminOverviewStatCard } from '@/components/acadia/admin-dashboard/admin-overview-stat-card';
import { AdminQuickActions } from '@/components/acadia/admin-dashboard/admin-quick-actions';
import { AdminRecentActivities } from '@/components/acadia/admin-dashboard/admin-recent-activities';
import { formatDashboardStatValue } from '@/components/acadia/dashboard-stat-card';
import { formatMoneyMinor } from '@/lib/acadia/finance';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchAdminDashboardStats } from '@/lib/supabase/queries/admin-dashboard';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

function formatGrowthFooter(percent: number | null | undefined, fallback: string) {
  if (percent === null || percent === undefined) {
    return fallback;
  }
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent}% from last month`;
}

export default function AdminDashboardPage() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant context is required');
      }
      const supabase = requireBrowserClient();
      return fetchAdminDashboardStats(supabase, tenantId);
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  return (
    <AcadiaPageShell
      title="Admin dashboard"
      description="Welcome to Acadia College. Overview of students, staff, classes, and finance."
    >
      <div className="space-y-7.5">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <AdminOverviewStatCard
            title="Total Students"
            value={formatDashboardStatValue(stats?.students)}
            footer={formatGrowthFooter(
              stats?.studentsGrowthPercent,
              'Enrollment overview',
            )}
            footerTone={
              stats?.studentsGrowthPercent != null && stats.studentsGrowthPercent >= 0
                ? 'positive'
                : 'muted'
            }
            icon="teacher"
          />
          <AdminOverviewStatCard
            title="Total Teachers"
            value={formatDashboardStatValue(stats?.teachers)}
            footer={
              stats?.teachersNewThisMonth != null && stats.teachersNewThisMonth > 0
                ? `+${stats.teachersNewThisMonth} new this month`
                : 'Staff on record'
            }
            footerTone={
              stats?.teachersNewThisMonth != null && stats.teachersNewThisMonth > 0
                ? 'positive'
                : 'muted'
            }
            icon="users"
          />
          <AdminOverviewStatCard
            title="Active Classes"
            value={formatDashboardStatValue(stats?.activeClasses)}
            footer="Across all levels"
            icon="book-open"
          />
          <AdminOverviewStatCard
            title="Revenue"
            value={
              stats?.revenueMinor != null
                ? formatMoneyMinor(stats.revenueMinor)
                : formatDashboardStatValue(undefined)
            }
            footer={formatGrowthFooter(stats?.revenueGrowthPercent, 'Fee collections')}
            footerTone={
              stats?.revenueGrowthPercent != null && stats.revenueGrowthPercent >= 0
                ? 'positive'
                : 'muted'
            }
            icon="dollar"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AdminRecentActivities />
          </div>
          <div>
            <AdminQuickActions />
          </div>
        </div>
      </div>
    </AcadiaPageShell>
  );
}
