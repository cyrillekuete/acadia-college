'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { FinanceAnnualReport } from '@/components/acadia/finance/finance-annual-report';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function FinanceAnnualReportPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('finance.annualStatement')}
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
