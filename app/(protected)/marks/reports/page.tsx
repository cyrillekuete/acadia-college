'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { GradeReportView } from '@/components/acadia/assessment/grade-report-view';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function MarksReportsPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('marks.reportsTitle')}
      description="Generate and print class grade reports (FR-4.1.3)."
    >
      <div className="mb-4 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/marks">Back to marks</Link>
        </Button>
      </div>
      <GradeReportView />
    </AcadiaPageShell>
  );
}
