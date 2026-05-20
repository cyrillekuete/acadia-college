'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { DashboardStatCard } from '@/components/acadia/dashboard-stat-card';

export default function StudentDashboardPage() {
  return (
    <AcadiaPageShell
      title="Acadia College — Student dashboard"
      description="Welcome to Acadia College. Your enrollment, schedule, and academic progress."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard title="Enrolled subjects" value="—" icon="book" />
        <DashboardStatCard title="Timetable today" value="—" icon="calendar-tick" />
        <DashboardStatCard title="Attendance" value="—" icon="document" />
        <DashboardStatCard title="Fee balance" value="—" icon="wallet" />
      </div>
    </AcadiaPageShell>
  );
}
