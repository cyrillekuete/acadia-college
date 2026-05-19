'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { FinanceSummaryPanel } from '@/components/acadia/finance/finance-summary-panel';
import { Button } from '@/components/ui/button';

export default function FinanceReportsPage() {
  return (
    <AcadiaPageShell
      title="Financial reports"
      description="Summaries of collections, outstanding balances, and ledger activity (FR-6.2.1)."
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/fees">Student fees</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/reports/annual">Annual statement</Link>
        </Button>
      </div>
      <FinanceSummaryPanel />
    </AcadiaPageShell>
  );
}
