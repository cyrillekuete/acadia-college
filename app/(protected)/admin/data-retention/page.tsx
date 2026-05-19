'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { DataRetentionSettingsForm } from '@/components/acadia/promotion/data-retention-settings-form';

export default function DataRetentionPage() {
  return (
    <AcadiaPageShell
      title="Data retention"
      description="Archival policy and retention job for inactive students and old enrollments."
    >
      <DataRetentionSettingsForm />
    </AcadiaPageShell>
  );
}
