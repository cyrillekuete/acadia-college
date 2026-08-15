'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SalesPanel } from '@/components/acadia/finance/sales-panel';
import { useTranslation } from '@/hooks/useTranslation';

export default function FinanceSalesPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('finance.salesTitle')}
      description={t('finance.salesDescription')}
    >
      <SalesPanel />
    </AcadiaPageShell>
  );
}
