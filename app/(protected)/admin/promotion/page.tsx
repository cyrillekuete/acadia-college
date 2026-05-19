'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { PromotionAdminPanel } from '@/components/acadia/promotion/promotion-admin-panel';

export default function AdminPromotionPage() {
  return (
    <AcadiaPageShell
      title="Promotion management"
      description="Automatic promotion by year average and manual overrides for exceptional cases."
    >
      <PromotionAdminPanel />
    </AcadiaPageShell>
  );
}
