'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { BudgetPanel } from '@/components/acadia/finance/budget-panel';
import { useTranslation } from '@/hooks/useTranslation';

export default function FinanceBudgetPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('finance.budgetTitle')}
      description={t('finance.budgetDescription')}
    >
      <BudgetPanel />
    </AcadiaPageShell>
  );
}
