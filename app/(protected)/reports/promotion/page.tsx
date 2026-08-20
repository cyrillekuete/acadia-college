'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ReportsAccessGate } from '@/components/acadia/report-cards/reports-access-gate';
import { PromotionStatementView } from '@/components/acadia/promotion/promotion-statement-view';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { canViewPromotionStatement } from '@/lib/acadia/reports-access';

export default function PromotionStatementPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  return (
    <ReportsAccessGate allowed={canViewPromotionStatement(session?.roleSlug)}>
      <AcadiaPageShell
        title={t('reports.promotionTitle')}
        description={t('reports.promotionDescription')}
      >
        <PromotionStatementView />
      </AcadiaPageShell>
    </ReportsAccessGate>
  );
}
