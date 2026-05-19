'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AcademicReportView } from '@/components/acadia/assessment/academic-report-view';

export default function SequenceResultsReportPage() {
  return (
    <AcadiaPageShell
      title="Sequence results"
      description="Generate sequence examination results (FR-4.3.1)."
    >
      <AcademicReportView kind="sequence" />
    </AcadiaPageShell>
  );
}
