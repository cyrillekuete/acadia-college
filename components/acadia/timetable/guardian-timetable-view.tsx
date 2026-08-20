'use client';

import { useEffect, useMemo, useState } from 'react';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { WeeklyTimetableGrid } from '@/components/acadia/timetable/weekly-timetable-grid';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLinkedGuardianStudents } from '@/hooks/use-linked-guardian-students';
import { useActiveYearTimetablePublish } from '@/hooks/use-timetable-publish';
import { useTimetableSlotsForStudent } from '@/hooks/use-timetable-slots';
import { mapTimetableRowToGridSlot } from '@/lib/acadia/timetable-grid';
import { TimetableUnpublishedNotice } from '@/components/acadia/timetable/timetable-unpublished-notice';

export function GuardianTimetableView() {
  const {
    data: linkedStudents = [],
    isLoading: studentsLoading,
    isError: studentsError,
  } = useLinkedGuardianStudents();
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<
    string | null
  >(null);
  const { canView, isLoading: publishLoading } = useActiveYearTimetablePublish();

  useEffect(() => {
    if (linkedStudents.length === 0) {
      setSelectedStudentProfileId(null);
      return;
    }
    if (
      !selectedStudentProfileId ||
      !linkedStudents.some(
        (student) => student.studentProfileId === selectedStudentProfileId,
      )
    ) {
      setSelectedStudentProfileId(linkedStudents[0]!.studentProfileId);
    }
  }, [linkedStudents, selectedStudentProfileId]);

  const selectedStudent = useMemo(
    () =>
      linkedStudents.find(
        (student) => student.studentProfileId === selectedStudentProfileId,
      ) ?? null,
    [linkedStudents, selectedStudentProfileId],
  );

  const { data: slotRows = [], isLoading: slotsLoading } =
    useTimetableSlotsForStudent(selectedStudentProfileId, { enabled: canView });

  const gridSlots = useMemo(
    () => slotRows.map(mapTimetableRowToGridSlot),
    [slotRows],
  );

  if (studentsLoading || publishLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  if (studentsError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Unable to load linked students. Please try again later.
        </CardContent>
      </Card>
    );
  }

  if (linkedStudents.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No linked students were found for your account. Contact an administrator
          if you believe this is an error.
        </CardContent>
      </Card>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-4">
        <CurrentAcademicYearBadge label="Year" />
        <TimetableUnpublishedNotice />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CurrentAcademicYearBadge label="Year" />
        {linkedStudents.length > 1 ? (
          <Select
            value={selectedStudentProfileId ?? undefined}
            onValueChange={setSelectedStudentProfileId}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              {linkedStudents.map((student) => (
                <SelectItem
                  key={student.studentProfileId}
                  value={student.studentProfileId}
                >
                  {student.studentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm font-medium">{selectedStudent?.studentName}</p>
        )}
      </div>

      {selectedStudent?.className ? (
        <p className="text-sm text-muted-foreground">
          Class: {selectedStudent.className}
        </p>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {selectedStudent?.studentName} is not enrolled in a class for this
            academic year. Their timetable will appear here once enrollment is
            complete.
          </CardContent>
        </Card>
      )}

      {selectedStudent?.classId ? (
        <WeeklyTimetableGrid
          slots={gridSlots}
          isLoading={slotsLoading}
          display={{ showClassName: false, showTeacherName: true }}
          emptyMessage="No timetable slots for this class yet."
        />
      ) : null}
    </div>
  );
}
