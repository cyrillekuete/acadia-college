'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ReportCardTemplatesWrapper } from '@/components/acadia/report-cards/report-card-templates-wrapper';
import { useTranslation } from '@/hooks/useTranslation';

export default function ReportCardTemplatesPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('reports.templatesTitle')}
      description={t('reports.templatesDescription')}
    >
      <ReportCardTemplatesWrapper />
    </AcadiaPageShell>
  );
}
