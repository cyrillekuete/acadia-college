'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { DataRetentionSettingsForm } from '@/components/acadia/promotion/data-retention-settings-form';
import { useTranslation } from '@/hooks/useTranslation';

export default function DataRetentionPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('admin.dataRetention')}
      description="Archival policy and retention job for inactive students and old enrollments."
    >
      <DataRetentionSettingsForm />
    </AcadiaPageShell>
  );
}
