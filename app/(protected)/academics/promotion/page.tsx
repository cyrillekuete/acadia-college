'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { PromotionAdminPanel } from '@/components/acadia/promotion/promotion-admin-panel';

export default function AcademicsPromotionPage() {
  return (
    <AcadiaPageShell
      title="Promotion management"
      description="Configure per-class promotion rules and compute student promotion decisions."
    >
      <PromotionAdminPanel />
    </AcadiaPageShell>
  );
}
