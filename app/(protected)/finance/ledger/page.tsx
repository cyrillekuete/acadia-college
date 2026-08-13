'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { FinanceLedgerPanel } from '@/components/acadia/finance/finance-ledger-panel';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function FinanceLedgerPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('finance.ledgerTitle')}
      description="School ledger for non-tuition income and operating expenses (FR-6.2.2)."
    >
      <div className="mb-4 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/reports">{t('finance.reportsTitle')}</Link>
        </Button>
      </div>
      <FinanceLedgerPanel />
    </AcadiaPageShell>
  );
}
