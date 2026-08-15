'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ClassReportWrapper } from '@/components/acadia/report-cards/class-report-wrapper';
import { useTranslation } from '@/hooks/useTranslation';

export default function ClassReportPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('reports.classTitle')}
      description={t('reports.classDescription')}
    >
      <ClassReportWrapper />
    </AcadiaPageShell>
  );
}
