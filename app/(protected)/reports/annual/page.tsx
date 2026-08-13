'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AcademicReportView } from '@/components/acadia/assessment/academic-report-view';
import { useTranslation } from '@/hooks/useTranslation';

export default function AnnualSummaryReportPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('reports.annualTitle')}
      description="Year-end academic summary by class (FR-4.3.3)."
    >
      <AcademicReportView kind="annual" />
    </AcadiaPageShell>
  );
}
