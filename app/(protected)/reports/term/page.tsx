'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AcademicReportView } from '@/components/acadia/assessment/academic-report-view';
import { useTranslation } from '@/hooks/useTranslation';

export default function TermReportCardsPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('reports.termTitle')}
      description="Generate term report cards for a class (FR-4.3.2)."
    >
      <AcademicReportView kind="term" />
    </AcadiaPageShell>
  );
}
