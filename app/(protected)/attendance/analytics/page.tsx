'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AttendanceAnalyticsPanel } from '@/components/acadia/attendance/attendance-analytics-panel';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function AttendanceAnalyticsPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('attendance.analyticsTitle')}
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
