'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ExpendituresPanel } from '@/components/acadia/finance/expenditures-panel';
import { useTranslation } from '@/hooks/useTranslation';

export default function FinanceExpendituresPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('finance.expendituresTitle')}
      description={t('finance.expendituresDescription')}
    >
      <ExpendituresPanel />
    </AcadiaPageShell>
  );
}
