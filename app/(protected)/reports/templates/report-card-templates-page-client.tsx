'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ReportsAccessGate } from '@/components/acadia/report-cards/reports-access-gate';
import { ReportCardTemplatesWrapper } from '@/components/acadia/report-cards/report-card-templates-wrapper';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { canViewReportCardTemplates } from '@/lib/acadia/reports-access';

export function ReportCardTemplatesPageClient() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  return (
    <ReportsAccessGate allowed={canViewReportCardTemplates(session?.roleSlug)}>
      <AcadiaPageShell
        title={t('reports.templatesTitle')}
        description={t('reports.templatesDescription')}
      >
        <ReportCardTemplatesWrapper />
      </AcadiaPageShell>
    </ReportsAccessGate>
  );
}
