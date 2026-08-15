'use client';

import { useMemo } from 'react';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { WeeklyTimetableGrid } from '@/components/acadia/timetable/weekly-timetable-grid';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { useActiveYearTimetablePublish } from '@/hooks/use-timetable-publish';
import { useTimetableSlotsForStudent } from '@/hooks/use-timetable-slots';
import { mapTimetableRowToGridSlot } from '@/lib/acadia/timetable-grid';
import { TimetableUnpublishedNotice } from '@/components/acadia/timetable/timetable-unpublished-notice';

export function StudentTimetableView() {
  const {
    data: linkedProfile,
    isLoading: profileLoading,
    isError: profileError,
  } = useLinkedAcadiaProfile({ includeEnrollment: true });
  const studentProfileId = linkedProfile?.studentProfileId ?? null;
  const enrollment = linkedProfile?.enrollment ?? null;
  const { canView, isLoading: publishLoading } = useActiveYearTimetablePublish();

  const { data: slotRows = [], isLoading: slotsLoading } =
    useTimetableSlotsForStudent(studentProfileId, { enabled: canView });

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
          Unable to load your student profile. Please try again later.
        </CardContent>
      </Card>
    );
  }

  if (!studentProfileId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Your account is not linked to a student profile. Contact an administrator
          if you believe this is an error.
        </CardContent>
      </Card>
    );
  }

  if (!enrollment) {
    return (
      <div className="space-y-4">
        <CurrentAcademicYearBadge label="Year" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You are not enrolled in a class for this academic year. Your timetable
            will appear here once enrollment is complete.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <CurrentAcademicYearBadge label="Year" />
          <p className="text-sm font-medium">{enrollment.className}</p>
        </div>
        <TimetableUnpublishedNotice />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <CurrentAcademicYearBadge label="Year" />
        <p className="text-sm font-medium">{enrollment.className}</p>
      </div>
      <WeeklyTimetableGrid
        slots={gridSlots}
        isLoading={slotsLoading}
        display={{ showClassName: false, showTeacherName: true }}
        emptyMessage="No timetable slots for your class yet."
      />
    </div>
  );
}
