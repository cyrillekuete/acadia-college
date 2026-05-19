'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { FinanceAnnualReport } from '@/components/acadia/finance/finance-annual-report';
import { Button } from '@/components/ui/button';

export default function FinanceAnnualReportPage() {
  return (
    <AcadiaPageShell
      title="Year-end financial statement"
      description="Annual consolidated report for the selected academic year (FR-6.2.4)."
    >
      <div className="mb-4 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/finance/reports">Back to reports</Link>
        </Button>
      </div>
      <FinanceAnnualReport />
    </AcadiaPageShell>
  );
}
