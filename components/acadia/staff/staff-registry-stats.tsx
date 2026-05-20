'use client';

import { AdminOverviewStatCard } from '@/components/acadia/admin-dashboard/admin-overview-stat-card';
import { formatDashboardStatValue } from '@/components/acadia/dashboard-stat-card';
import type { StaffRegistryStats } from '@/lib/acadia/staff-registry';

export function StaffRegistryStats({
  stats,
  isLoading,
}: {
  stats: StaffRegistryStats;
  isLoading?: boolean;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <AdminOverviewStatCard
        title="Total Teachers"
        value={isLoading ? '—' : formatDashboardStatValue(stats.total)}
        footer={
          isLoading
            ? 'Loading…'
            : `${stats.active} active, ${stats.inactive} inactive`
        }
        icon="teacher"
      />
      <AdminOverviewStatCard
        title="New Teachers"
        value={isLoading ? '—' : formatDashboardStatValue(stats.newLast7Days)}
        footer="Last 7 days"
        icon="user-tick"
      />
      <AdminOverviewStatCard
        title="Subjects Covered"
        value={
          isLoading ? '—' : formatDashboardStatValue(stats.subjectsCoveredCount)
        }
        footer="Distinct subjects assigned"
        icon="book-open"
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
