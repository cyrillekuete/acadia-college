'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AcademicReportView } from '@/components/acadia/assessment/academic-report-view';
import { useTranslation } from '@/hooks/useTranslation';

export default function SequenceResultsReportPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('reports.sequenceTitle')}
      description="Generate sequence examination results (FR-4.3.1)."
    >
      <AcademicReportView kind="sequence" />
    </AcadiaPageShell>
  );
}
