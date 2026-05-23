'use client';

import Link from 'next/link';
import { TeacherTimetableView } from '@/components/acadia/timetable/teacher-timetable-view';
import { TimetablePrintButton } from '@/components/acadia/timetable/timetable-print-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StaffDashboardTimetableSection() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>My teaching schedule</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <TimetablePrintButton label="Print" />
          <Button variant="outline" size="sm" asChild>
            <Link href="/timetable">View full timetable</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <TeacherTimetableView />
      </CardContent>
    </Card>
  );
}
