'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { LedgerPanel } from '@/components/acadia/finance/ledger-panel';
import { useTranslation } from '@/hooks/useTranslation';

export default function FinanceLedgerPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('finance.ledgerTitle')}
      description={t('finance.ledgerDescription')}
    >
      <LedgerPanel />
    </AcadiaPageShell>
  );
}
