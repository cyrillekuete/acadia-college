'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminOverviewStatCard } from '@/components/acadia/admin-dashboard/admin-overview-stat-card';
import { formatDashboardStatValue } from '@/components/acadia/dashboard-stat-card';
import { useStudentDashboardStats } from '@/hooks/use-role-dashboard-stats';
import { formatAttendancePercentage } from '@/lib/acadia/attendance';
import { formatMoneyMinor } from '@/lib/acadia/finance';
import type { StudentDashboardStats } from '@/lib/supabase/queries/role-dashboard';
import { useTranslation } from '@/hooks/useTranslation';

export function StudentDashboardView({
  initialStats,
  seedYearId,
}: {
  initialStats?: StudentDashboardStats | null;
  seedYearId?: string | null;
}) {
  const { t } = useTranslation();
  const { data: stats } = useStudentDashboardStats(initialStats, seedYearId);

  return (
    <AcadiaPageShell
      title={t('admin.studentDashboard')}
      description="Welcome to Acadia College. Your enrollment, schedule, and academic progress."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <AdminOverviewStatCard
          title={t('admin.enrolledSubjects')}
          value={formatDashboardStatValue(stats?.enrolledSubjectCount)}
          footer="Current term"
          icon="book"
        />
        <AdminOverviewStatCard
          title={t('admin.timetableToday')}
          value={formatDashboardStatValue(stats?.todaysSessionCount)}
          footer="Today's schedule"
          icon="calendar-tick"
        />
        <AdminOverviewStatCard
          title={t('attendance.title')}
          value={formatAttendancePercentage(stats?.attendancePercent)}
          footer="This term"
          icon="document"
        />
        <AdminOverviewStatCard
          title={t('admin.feeBalance')}
          value={
            stats?.feeBalanceMinor != null
              ? formatMoneyMinor(stats.feeBalanceMinor)
              : formatDashboardStatValue(undefined)
          }
          footer="Outstanding balance"
          icon="wallet"
        />
      </div>
    </AcadiaPageShell>
  );
}
