'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AttendanceAnalyticsPanel } from '@/components/acadia/attendance/attendance-analytics-panel';
import { Button } from '@/components/ui/button';

export default function AttendanceAnalyticsPage() {
  return (
    <AcadiaPageShell
      title="Attendance analytics"
      description="Identify attendance patterns and at-risk students (FR-5.2.2)."
    >
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/attendance">Back to attendance</Link>
        </Button>
      </div>
      <AttendanceAnalyticsPanel />
    </AcadiaPageShell>
  );
}
