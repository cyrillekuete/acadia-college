'use client';

import { useMemo } from 'react';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminOverviewStatCard } from '@/components/acadia/admin-dashboard/admin-overview-stat-card';
import { formatDashboardStatValue } from '@/components/acadia/dashboard-stat-card';
import { StaffDashboardTimetableSection } from '@/components/acadia/staff-dashboard/staff-dashboard-timetable-section';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { useStaffDashboardStats } from '@/hooks/use-role-dashboard-stats';
import { useActiveYearTimetablePublish } from '@/hooks/use-timetable-publish';
import { useTimetableSlotsForTeacher } from '@/hooks/use-timetable-slots';
import {
  countTimetableSlotsForDay,
  getTimetableDayOfWeek,
} from '@/lib/acadia/timetable';
import type { StaffDashboardStats } from '@/lib/supabase/queries/role-dashboard';
import { useTranslation } from '@/hooks/useTranslation';

export function StaffDashboardView({
  initialStats,
  seedYearId,
}: {
  initialStats?: StaffDashboardStats | null;
  seedYearId?: string | null;
}) {
  const { t } = useTranslation();
  const {
    data: linkedProfile,
    isLoading: profileLoading,
  } = useLinkedAcadiaProfile();
  const staffProfileId = linkedProfile?.staffProfileId ?? null;
  const { canView, isLoading: publishLoading } = useActiveYearTimetablePublish();

  const { data: stats } = useStaffDashboardStats(initialStats, seedYearId);
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
      title={t('admin.staffDashboard')}
      description="Welcome to Acadia College. Your teaching and operations overview."
    >
      <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-3">
          <AdminOverviewStatCard
            title={t('admin.mySubjects')}
            value={formatDashboardStatValue(stats?.assignedSubjectCount)}
            footer="Assigned this term"
            icon="book"
          />
          <AdminOverviewStatCard
            title={t('admin.todaysSessions')}
            value={formatDashboardStatValue(todaysSessions)}
            footer="Scheduled for today"
            icon="calendar-tick"
          />
          <AdminOverviewStatCard
            title={t('admin.pendingMarks')}
            value={formatDashboardStatValue(stats?.pendingMarkCount)}
            footer="Awaiting submission"
            icon="document"
          />
        </div>
        <StaffDashboardTimetableSection />
      </div>
    </AcadiaPageShell>
  );
}
