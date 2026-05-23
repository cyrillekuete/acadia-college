'use client';

import { ActiveAcademicYearPrintHeader } from '@/components/acadia/academics/active-academic-year-print-header';

export function TeacherTimetablePrintHeader({
  teacherName,
}: {
  teacherName?: string | null;
}) {
  return (
    <div className="hidden print:block print:mb-4 print:space-y-1">
      <h2 className="text-lg font-semibold">Acadia College — Teaching Timetable</h2>
      {teacherName ? (
        <p className="text-sm text-muted-foreground">Teacher: {teacherName}</p>
      ) : null}
      <ActiveAcademicYearPrintHeader />
    </div>
  );
}
