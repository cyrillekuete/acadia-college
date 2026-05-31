'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminOverviewStatCard } from '@/components/acadia/admin-dashboard/admin-overview-stat-card';
import { formatDashboardStatValue } from '@/components/acadia/dashboard-stat-card';
import { useStudentDashboardStats } from '@/hooks/use-role-dashboard-stats';
import { formatAttendancePercentage } from '@/lib/acadia/attendance';
import { formatMoneyMinor } from '@/lib/acadia/finance';

export default function StudentDashboardPage() {
  const { data: stats } = useStudentDashboardStats();

  return (
    <AcadiaPageShell
      title="Acadia College — Student dashboard"
      description="Welcome to Acadia College. Your enrollment, schedule, and academic progress."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <AdminOverviewStatCard
          title="Enrolled subjects"
          value={formatDashboardStatValue(stats?.enrolledSubjectCount)}
          footer="Current term"
          icon="book"
        />
        <AdminOverviewStatCard
          title="Timetable today"
          value={formatDashboardStatValue(stats?.todaysSessionCount)}
          footer="Today's schedule"
          icon="calendar-tick"
        />
        <AdminOverviewStatCard
          title="Attendance"
          value={formatAttendancePercentage(stats?.attendancePercent)}
          footer="This term"
          icon="document"
        />
        <AdminOverviewStatCard
          title="Fee balance"
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
