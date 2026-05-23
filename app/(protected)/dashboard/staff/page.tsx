'use client';

import { useMemo } from 'react';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminOverviewStatCard } from '@/components/acadia/admin-dashboard/admin-overview-stat-card';
import { formatDashboardStatValue } from '@/components/acadia/dashboard-stat-card';
import { StaffDashboardTimetableSection } from '@/components/acadia/staff-dashboard/staff-dashboard-timetable-section';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { useActiveYearTimetablePublish } from '@/hooks/use-timetable-publish';
import { useTimetableSlotsForTeacher } from '@/hooks/use-timetable-slots';
import {
  countTimetableSlotsForDay,
  getTimetableDayOfWeek,
} from '@/lib/acadia/timetable';

export default function StaffDashboardPage() {
  const {
    data: linkedProfile,
    isLoading: profileLoading,
  } = useLinkedAcadiaProfile();
  const staffProfileId = linkedProfile?.staffProfileId ?? null;
  const { canView, isLoading: publishLoading } = useActiveYearTimetablePublish();

  const { data: slotRows = [], isLoading: slotsLoading } =
    useTimetableSlotsForTeacher(staffProfileId, { enabled: canView });

  const todaysSessions = useMemo(() => {
    if (
      profileLoading ||
      publishLoading ||
      slotsLoading ||
      !staffProfileId ||
      !canView
    ) {
      return undefined;
    }

    return countTimetableSlotsForDay(slotRows, getTimetableDayOfWeek());
  }, [
    canView,
    profileLoading,
    publishLoading,
    slotRows,
    slotsLoading,
    staffProfileId,
  ]);

  return (
    <AcadiaPageShell
      title="Acadia College — Staff dashboard"
      description="Welcome to Acadia College. Your teaching and operations overview."
    >
      <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-3">
          <AdminOverviewStatCard
            title="My subjects"
            value="—"
            footer="Assigned this term"
            icon="book"
          />
          <AdminOverviewStatCard
            title="Today's sessions"
            value={formatDashboardStatValue(todaysSessions)}
            footer="Scheduled for today"
            icon="calendar-tick"
          />
          <AdminOverviewStatCard
            title="Pending marks"
            value="—"
            footer="Awaiting submission"
            icon="document"
          />
        </div>
        <StaffDashboardTimetableSection />
      </div>
    </AcadiaPageShell>
  );
}
