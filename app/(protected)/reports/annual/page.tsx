'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AcademicReportView } from '@/components/acadia/assessment/academic-report-view';

export default function AnnualSummaryReportPage() {
  return (
    <AcadiaPageShell
      title="Annual academic summary"
      description="Year-end academic summary by class (FR-4.3.3)."
    >
      <AcademicReportView kind="annual" />
    </AcadiaPageShell>
  );
}
