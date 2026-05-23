'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminOverviewStatCard } from '@/components/acadia/admin-dashboard/admin-overview-stat-card';

export default function StudentDashboardPage() {
  return (
    <AcadiaPageShell
      title="Acadia College — Student dashboard"
      description="Welcome to Acadia College. Your enrollment, schedule, and academic progress."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <AdminOverviewStatCard
          title="Enrolled subjects"
          value="—"
          footer="Current term"
          icon="book"
        />
        <AdminOverviewStatCard
          title="Timetable today"
          value="—"
          footer="Today's schedule"
          icon="calendar-tick"
        />
        <AdminOverviewStatCard
          title="Attendance"
          value="—"
          footer="This term"
          icon="document"
        />
        <AdminOverviewStatCard
          title="Fee balance"
          value="—"
          footer="Outstanding balance"
          icon="wallet"
        />
      </div>
    </AcadiaPageShell>
  );
}
