'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AttendanceReportsView } from '@/components/acadia/attendance/attendance-reports-view';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function AttendanceReportsPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('attendance.reportsTitle')}
      description="Attendance summaries and session history (FR-5.1.3, FR-5.2.3)."
    >
      <div className="mb-4 flex gap-2 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/attendance">Back to attendance</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          Print report
        </Button>
      </div>
      <AttendanceReportsView />
    </AcadiaPageShell>
  );
}
