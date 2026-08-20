'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { FinanceSummaryPanel } from '@/components/acadia/finance/finance-summary-panel';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function FinanceReportsPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('finance.reportsTitle')}
      description="Summaries of collections, outstanding balances, and ledger activity (FR-6.2.1)."
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/fees">{t('finance.feesTitle')}</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/reports/annual">{t('finance.annualStatement')}</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/ledger">{t('finance.ledgerTitle')}</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/budget">{t('finance.budgetTitle')}</Link>
        </Button>
      </div>
      <FinanceSummaryPanel />
    </AcadiaPageShell>
  );
}
