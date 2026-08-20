'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ReportsAccessGate } from '@/components/acadia/report-cards/reports-access-gate';
import { ReportCardsWrapper } from '@/components/acadia/report-cards/report-cards-wrapper';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { canViewAcademicReports } from '@/lib/acadia/reports-access';

export default function AnnualSummaryReportPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  return (
    <ReportsAccessGate allowed={canViewAcademicReports(session?.roleSlug)}>
      <AcadiaPageShell
        title={t('reports.annualTitle')}
        description={t('reports.annualDescription')}
      >
        <ReportCardsWrapper defaultTerm="annual" />
      </AcadiaPageShell>
    </ReportsAccessGate>
  );
}
