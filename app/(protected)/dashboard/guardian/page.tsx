'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import {
  DashboardStatCard,
  formatDashboardStatValue,
} from '@/components/acadia/dashboard-stat-card';
import { useGuardianDashboardStats } from '@/hooks/use-role-dashboard-stats';
import { formatMoneyMinor } from '@/lib/acadia/finance';

export default function GuardianDashboardPage() {
  const { data: stats } = useGuardianDashboardStats();

  return (
    <AcadiaPageShell
      title="Acadia College — Guardian dashboard"
      description="Welcome to Acadia College. Overview for linked students."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          title="Linked students"
          value={formatDashboardStatValue(stats?.linkedStudentCount)}
          icon="users"
        />
        <DashboardStatCard
          title="Attendance alerts"
          value={formatDashboardStatValue(stats?.attendanceAlertCount)}
          icon="calendar-tick"
        />
        <DashboardStatCard
          title="Recent marks"
          value={formatDashboardStatValue(stats?.recentMarkCount)}
          icon="document"
        />
        <DashboardStatCard
          title="Outstanding fees"
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
