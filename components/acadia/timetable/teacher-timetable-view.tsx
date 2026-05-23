'use client';

import { useMemo } from 'react';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { TeacherTimetablePrintHeader } from '@/components/acadia/timetable/teacher-timetable-print-header';
import { TimetablePrintButton } from '@/components/acadia/timetable/timetable-print-button';
import { WeeklyTimetableGrid } from '@/components/acadia/timetable/weekly-timetable-grid';
import { TimetableUnpublishedNotice } from '@/components/acadia/timetable/timetable-unpublished-notice';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { useActiveYearTimetablePublish } from '@/hooks/use-timetable-publish';
import { useTimetableSlotsForTeacher } from '@/hooks/use-timetable-slots';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { mapTimetableRowToGridSlot } from '@/lib/acadia/timetable-grid';

export function TeacherTimetableView({
  showPrintAction = false,
}: {
  /** Show an inline print button (e.g. staff dashboard). Timetable page uses toolbar actions instead. */
  showPrintAction?: boolean;
}) {
  const { data: session } = useAcadiaCollegeSession();
  const teacherName = session?.profile?.name?.trim() || null;
  const {
    data: linkedProfile,
    isLoading: profileLoading,
    isError: profileError,
  } = useLinkedAcadiaProfile();
  const staffProfileId = linkedProfile?.staffProfileId ?? null;
  const { canView, isLoading: publishLoading } = useActiveYearTimetablePublish();

  const { data: slotRows = [], isLoading: slotsLoading } =
    useTimetableSlotsForTeacher(staffProfileId, { enabled: canView });

  const gridSlots = useMemo(
    () => slotRows.map(mapTimetableRowToGridSlot),
    [slotRows],
  );

  if (profileLoading || publishLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  if (profileError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Unable to load your staff profile. Please try again later.
        </CardContent>
      </Card>
    );
  }

  if (!staffProfileId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Your account is not linked to a staff profile. Contact an administrator
          to view your teaching timetable.
        </CardContent>
      </Card>
    );
  }

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <CurrentAcademicYearBadge />
      {showPrintAction ? <TimetablePrintButton /> : null}
    </div>
  );

  if (!canView) {
    return (
      <div className="space-y-4 print:space-y-3">
        {toolbar}
        <TeacherTimetablePrintHeader teacherName={teacherName} />
        <TimetableUnpublishedNotice />
      </div>
    );
  }

  return (
    <div className="space-y-4 print:space-y-3">
      {toolbar}
      <TeacherTimetablePrintHeader teacherName={teacherName} />
      <WeeklyTimetableGrid
        slots={gridSlots}
        isLoading={slotsLoading}
        display={{ showClassName: true, showTeacherName: false }}
        emptyMessage="No teaching slots assigned to you for this academic year."
      />
    </div>
  );
}
