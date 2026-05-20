'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { PromotionStatementView } from '@/components/acadia/promotion/promotion-statement-view';

export default function PromotionStatementPage() {
  return (
    <AcadiaPageShell
      title="Promotion statements"
      description="Promotion and admission decisions from stored class-based policies (FR-4.3.4)."
    >
      <PromotionStatementView />
    </AcadiaPageShell>
  );
}
