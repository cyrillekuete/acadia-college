'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { DashboardStatCard } from '@/components/acadia/dashboard-stat-card';

export default function GuardianDashboardPage() {
  return (
    <AcadiaPageShell
      title="Acadia College — Guardian dashboard"
      description="Welcome to Acadia College. Overview for linked students."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard title="Linked students" value="—" icon="users" />
        <DashboardStatCard title="Attendance alerts" value="—" icon="calendar-tick" />
        <DashboardStatCard title="Recent marks" value="—" icon="document" />
        <DashboardStatCard title="Outstanding fees" value="—" icon="wallet" />
      </div>
    </AcadiaPageShell>
  );
}
