'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AcademicReportView } from '@/components/acadia/assessment/academic-report-view';

export default function TermReportCardsPage() {
  return (
    <AcadiaPageShell
      title="Term report cards"
      description="Generate term report cards for a class (FR-4.3.2)."
    >
      <AcademicReportView kind="term" />
    </AcadiaPageShell>
  );
}
