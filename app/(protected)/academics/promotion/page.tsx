'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { PromotionAdminPanel } from '@/components/acadia/promotion/promotion-admin-panel';
import { useTranslation } from '@/hooks/useTranslation';

export default function AcademicsPromotionPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('academics.promotionTitle')}
      description={t('academics.promotionDescription')}
    >
      <PromotionAdminPanel />
    </AcadiaPageShell>
  );
}
