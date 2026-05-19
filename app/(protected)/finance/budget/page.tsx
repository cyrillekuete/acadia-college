'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { FinanceBudgetPanel } from '@/components/acadia/finance/finance-budget-panel';
import { Button } from '@/components/ui/button';

export default function FinanceBudgetPage() {
  return (
    <AcadiaPageShell
      title="Budget reports"
      description="Budget vs actual by category for each academic year (FR-6.2.3)."
    >
      <div className="mb-4 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/reports">Financial reports</Link>
        </Button>
      </div>
      <FinanceBudgetPanel />
    </AcadiaPageShell>
  );
}
