'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import {
  DashboardStatCard,
  formatDashboardStatValue,
} from '@/components/acadia/dashboard-stat-card';
import { useGuardianDashboardStats } from '@/hooks/use-role-dashboard-stats';
import { formatMoneyMinor } from '@/lib/acadia/finance';
import type { GuardianDashboardStats } from '@/lib/supabase/queries/role-dashboard';
import { useTranslation } from '@/hooks/useTranslation';

export function GuardianDashboardView({
  initialStats,
  seedYearId,
}: {
  initialStats?: GuardianDashboardStats | null;
  seedYearId?: string | null;
}) {
  const { t } = useTranslation();
  const { data: stats } = useGuardianDashboardStats(initialStats, seedYearId);

  return (
    <AcadiaPageShell
      title={t('admin.guardianDashboard')}
      description="Welcome to Acadia College. Overview for linked students."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          title={t('admin.linkedStudents')}
          value={formatDashboardStatValue(stats?.linkedStudentCount)}
          icon="users"
        />
        <DashboardStatCard
          title={t('admin.attendanceAlerts')}
          value={formatDashboardStatValue(stats?.attendanceAlertCount)}
          icon="calendar-tick"
        />
        <DashboardStatCard
          title={t('admin.recentMarks')}
          value={formatDashboardStatValue(stats?.recentMarkCount)}
          icon="document"
        />
        <DashboardStatCard
          title={t('admin.outstandingFees')}
          value={
            stats?.outstandingFeesMinor != null
              ? formatMoneyMinor(stats.outstandingFeesMinor)
              : formatDashboardStatValue(undefined)
          }
          icon="wallet"
        />
      </div>
    </AcadiaPageShell>
  );
}
