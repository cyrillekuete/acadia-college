'use client';

import { Book, CalendarCheck, ScrollText, Wallet } from 'lucide-react';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { DashboardStatCard } from '@/components/acadia/dashboard-stat-card';

export default function StudentDashboardPage() {
  return (
    <AcadiaPageShell
      title="Acadia College — Student dashboard"
      description="Welcome to Acadia College. Your enrollment, schedule, and academic progress."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard title="Enrolled courses" value="—" icon={Book} />
        <DashboardStatCard title="Timetable today" value="—" icon={CalendarCheck} />
        <DashboardStatCard title="Attendance" value="—" icon={ScrollText} />
        <DashboardStatCard title="Fee balance" value="—" icon={Wallet} />
      </div>
    </AcadiaPageShell>
  );
}
