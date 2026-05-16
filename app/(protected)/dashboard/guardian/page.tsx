'use client';

import { CalendarCheck, ScrollText, Users, Wallet } from 'lucide-react';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { DashboardStatCard } from '@/components/acadia/dashboard-stat-card';

export default function GuardianDashboardPage() {
  return (
    <AcadiaPageShell
      title="Acadia College — Guardian dashboard"
      description="Welcome to Acadia College. Overview for linked students."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard title="Linked students" value="—" icon={Users} />
        <DashboardStatCard title="Attendance alerts" value="—" icon={CalendarCheck} />
        <DashboardStatCard title="Recent marks" value="—" icon={ScrollText} />
        <DashboardStatCard title="Outstanding fees" value="—" icon={Wallet} />
      </div>
    </AcadiaPageShell>
  );
}
