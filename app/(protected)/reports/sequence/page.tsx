'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ClassReportWrapper } from '@/components/acadia/report-cards/class-report-wrapper';
import { ReportsAccessGate } from '@/components/acadia/report-cards/reports-access-gate';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { canViewAcademicReports } from '@/lib/acadia/reports-access';

export default function SequenceResultsReportPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  return (
    <ReportsAccessGate allowed={canViewAcademicReports(session?.roleSlug)}>
      <AcadiaPageShell
        title={t('reports.sequenceTitle')}
        description={t('reports.sequenceDescription')}
      >
        <ClassReportWrapper lockedPeriodKind="sequence" />
      </AcadiaPageShell>
    </ReportsAccessGate>
  );
}
