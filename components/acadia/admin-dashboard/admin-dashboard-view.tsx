'use client';

import { useQuery } from '@tanstack/react-query';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminAcademicYearCard } from '@/components/acadia/admin-dashboard/admin-academic-year-card';
import { AdminOverviewStatCard } from '@/components/acadia/admin-dashboard/admin-overview-stat-card';
import { AdminQuickActions } from '@/components/acadia/admin-dashboard/admin-quick-actions';
import { AdminRecentActivities } from '@/components/acadia/admin-dashboard/admin-recent-activities';
import { formatDashboardStatValue } from '@/components/acadia/dashboard-stat-card';
import { formatMoneyMinor } from '@/lib/acadia/finance';
import { seededInitialData } from '@/lib/acadia/cache/tags';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchAdminDashboardStats,
  type AdminActivityItem,
  type AdminDashboardStats,
} from '@/lib/supabase/queries/admin-dashboard';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';

function formatGrowthFooter(percent: number | null | undefined, fallback: string) {
  if (percent === null || percent === undefined) {
    return fallback;
  }
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent}% from last month`;
}

export function AdminDashboardView({
  initialStats,
  initialActivities,
  seedYearId,
}: {
  initialStats?: AdminDashboardStats;
  initialActivities?: AdminActivityItem[];
  seedYearId?: string | null;
}) {
  const { t } = useTranslation();
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats', tenantId, activeYearId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant context is required');
      }
      const supabase = requireBrowserClient();
      return fetchAdminDashboardStats(supabase, tenantId, activeYearId ?? undefined);
    },
    initialData: seededInitialData(initialStats, seedYearId, activeYearId),
    staleTime: 60_000,
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  return (
    <AcadiaPageShell
      title={t('admin.dashboardTitle')}
      description="Welcome to Acadia College. Overview of students, staff, classes, and finance."
    >
      <div className="space-y-7.5">
        <AdminAcademicYearCard />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <AdminOverviewStatCard
            title={t('admin.totalStudents')}
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
            title={t('admin.totalTeachers')}
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
            title={t('admin.activeClasses')}
            value={formatDashboardStatValue(stats?.activeClasses)}
            footer="Across all levels"
            icon="book-open"
          />
          <AdminOverviewStatCard
            title={t('admin.activeSubjects')}
            value={formatDashboardStatValue(stats?.activeSubjects)}
            footer="In subject catalog"
            icon="book"
          />
          <AdminOverviewStatCard
            title={t('admin.revenue')}
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
            <AdminRecentActivities initialActivities={initialActivities} />
          </div>
          <div>
            <AdminQuickActions />
          </div>
        </div>
      </div>
    </AcadiaPageShell>
  );
}
