'use client';

import { useMemo } from 'react';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { WeeklyTimetableGrid } from '@/components/acadia/timetable/weekly-timetable-grid';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { useActiveYearTimetablePublish } from '@/hooks/use-timetable-publish';
import { useTimetableSlotsForTeacher } from '@/hooks/use-timetable-slots';
import { mapTimetableRowToGridSlot } from '@/lib/acadia/timetable-grid';
import { TimetableUnpublishedNotice } from '@/components/acadia/timetable/timetable-unpublished-notice';

export function TeacherTimetableView() {
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

  if (!canView) {
    return (
      <div className="space-y-4">
        <CurrentAcademicYearBadge />
        <TimetableUnpublishedNotice />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CurrentAcademicYearBadge />
      <WeeklyTimetableGrid
        slots={gridSlots}
        isLoading={slotsLoading}
        display={{ showClassName: true, showTeacherName: false }}
        emptyMessage="No teaching slots assigned to you for this academic year."
      />
    </div>
  );
}
