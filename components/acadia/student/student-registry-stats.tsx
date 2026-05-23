'use client';

import { AdminOverviewStatCard } from '@/components/acadia/admin-dashboard/admin-overview-stat-card';
import { formatDashboardStatValue } from '@/components/acadia/dashboard-stat-card';
import type {
  StudentRegistryStats,
  TeacherStudentRegistryStats,
} from '@/lib/acadia/student-registry';

export function StudentRegistryStats({
  mode,
  adminStats,
  teacherStats,
  isLoading,
}: {
  mode: 'admin' | 'teacher';
  adminStats: StudentRegistryStats;
  teacherStats: TeacherStudentRegistryStats;
  isLoading?: boolean;
}) {
  if (mode === 'teacher') {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminOverviewStatCard
          title="My Students"
          value={isLoading ? '—' : formatDashboardStatValue(teacherStats.total)}
          footer={
            isLoading
              ? 'Loading…'
              : `${teacherStats.active} active enrollment${teacherStats.active === 1 ? '' : 's'}`
          }
          icon="teacher"
        />
        <AdminOverviewStatCard
          title="Classes"
          value={isLoading ? '—' : formatDashboardStatValue(teacherStats.classCount)}
          footer="Assigned with matching subjects"
          icon="book-open"
        />
        <AdminOverviewStatCard
          title="Subjects"
          value={isLoading ? '—' : formatDashboardStatValue(teacherStats.subjectCount)}
          footer="In your teaching scope"
          icon="book"
        />
        <AdminOverviewStatCard
          title="Academic Year"
          value={isLoading ? '—' : teacherStats.academicYearLabel}
          footer="Current session"
          icon="calendar-tick"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <AdminOverviewStatCard
        title="Total Students"
        value={isLoading ? '—' : formatDashboardStatValue(adminStats.total)}
        footer={
          isLoading
            ? 'Loading…'
            : `${adminStats.active} active, ${adminStats.inactive} inactive`
        }
        icon="teacher"
      />
      <AdminOverviewStatCard
        title="New Students"
        value={isLoading ? '—' : formatDashboardStatValue(adminStats.newLast7Days)}
        footer="Last 7 days"
        icon="book-open"
      />
      <AdminOverviewStatCard
        title="Fees Collection"
        value={isLoading ? '—' : `${adminStats.feesCollectionPercent}%`}
        footer={isLoading ? 'Loading…' : adminStats.feesFooter}
        footerTone={adminStats.feesCollectionPercent > 0 ? 'positive' : 'muted'}
        icon="dollar"
      />
      <AdminOverviewStatCard
        title="Academic Year"
        value={isLoading ? '—' : adminStats.academicYearLabel}
        footer="Current session"
        icon="calendar-tick"
      />
    </div>
  );
}
