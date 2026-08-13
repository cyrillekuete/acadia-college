'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { PromotionStatementView } from '@/components/acadia/promotion/promotion-statement-view';
import { useTranslation } from '@/hooks/useTranslation';

export default function PromotionStatementPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('reports.promotionTitle')}
      description="Promotion and admission decisions from stored class-based policies (FR-4.3.4)."
    >
      <PromotionStatementView />
    </AcadiaPageShell>
  );
}
