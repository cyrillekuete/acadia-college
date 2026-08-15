'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ReportCardsWrapper } from '@/components/acadia/report-cards/report-cards-wrapper';
import { useTranslation } from '@/hooks/useTranslation';

export default function AnnualSummaryReportPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('reports.annualTitle')}
      description={t('reports.annualDescription')}
    >
      <ReportCardsWrapper defaultTerm="annual" />
    </AcadiaPageShell>
  );
}
