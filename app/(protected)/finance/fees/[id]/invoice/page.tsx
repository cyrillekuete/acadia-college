'use client';

import { use } from 'react';
import Link from 'next/link';
import { FeeInvoiceView } from '@/components/acadia/finance/fee-invoice-view';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function FeeInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const { id } = use(params);

  return (
    <RecordDetailShell
      title={t('finance.invoiceTitle')}
      description="Printable fee statement for this account."
      backHref={`/finance/fees/${id}`}
      backLabel="Back to account"
      isLoading={false}
      isError={false}
      error={null}
    >
      <div className="mb-4 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/finance/fees/${id}`}>Back to account</Link>
        </Button>
      </div>
      <FeeInvoiceView accountId={id} />
    </RecordDetailShell>
  );
}
