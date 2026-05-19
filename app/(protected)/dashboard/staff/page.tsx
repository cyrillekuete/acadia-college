'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { DashboardStatCard } from '@/components/acadia/dashboard-stat-card';
import { Card, CardContent } from '@/components/ui/card';

export default function StaffDashboardPage() {
  return (
    <AcadiaPageShell
      title="Acadia College — Staff dashboard"
      description="Welcome to Acadia College. Your teaching and operations overview."
    >
      <div className="grid gap-5 md:grid-cols-3">
        <DashboardStatCard title="My courses" value="—" icon="book" />
        <DashboardStatCard title="Today's sessions" value="—" icon="calendar-tick" />
        <DashboardStatCard title="Pending marks" value="—" icon="document" />
      </div>
      <Card className="mt-5">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Course assignments and timetable data appear here once linked to your staff
          profile in Supabase.
        </CardContent>
      </Card>
    </AcadiaPageShell>
  );
}
