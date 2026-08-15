'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ReportCardsWrapper } from '@/components/acadia/report-cards/report-cards-wrapper';
import { useTranslation } from '@/hooks/useTranslation';

export default function TermReportCardsPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('reports.termTitle')}
      description={t('reports.termDescription')}
    >
      <ReportCardsWrapper defaultTerm="1" />
    </AcadiaPageShell>
  );
}
