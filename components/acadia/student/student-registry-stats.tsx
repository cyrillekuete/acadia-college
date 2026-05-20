'use client';

import { AdminOverviewStatCard } from '@/components/acadia/admin-dashboard/admin-overview-stat-card';
import { formatDashboardStatValue } from '@/components/acadia/dashboard-stat-card';
import type { StudentRegistryStats } from '@/lib/acadia/student-registry';

export function StudentRegistryStats({
  stats,
  isLoading,
}: {
  stats: StudentRegistryStats;
  isLoading?: boolean;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <AdminOverviewStatCard
        title="Total Students"
        value={isLoading ? '—' : formatDashboardStatValue(stats.total)}
        footer={
          isLoading
            ? 'Loading…'
            : `${stats.active} active, ${stats.inactive} inactive`
        }
        icon="teacher"
      />
      <AdminOverviewStatCard
        title="New Students"
        value={isLoading ? '—' : formatDashboardStatValue(stats.newLast7Days)}
        footer="Last 7 days"
        icon="book-open"
      />
      <AdminOverviewStatCard
        title="Fees Collection"
        value={isLoading ? '—' : `${stats.feesCollectionPercent}%`}
        footer={isLoading ? 'Loading…' : stats.feesFooter}
        footerTone={stats.feesCollectionPercent > 0 ? 'positive' : 'muted'}
        icon="dollar"
      />
      <AdminOverviewStatCard
        title="Academic Year"
        value={isLoading ? '—' : stats.academicYearLabel}
        footer="Current session"
        icon="calendar-tick"
      />
    </div>
  );
}
