'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  computeFeeAccountTotals,
  formatMoneyMinor,
  paymentProgressPercent,
} from '@/lib/acadia/finance';
import { FeeStatusBadge } from '@/components/acadia/finance/fee-status-badge';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canWriteFinance } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export function FeeAccountInstallments({
  accountId,
  readOnly = false,
}: {
  accountId: string;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug) && !readOnly;
  const { recordFeePayment } = useFinanceMutations();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const query = useQuery({
    queryKey: ['fee-account-installments', tenantId, accountId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data: account, error: accountError } = await supabase
        .from('StudentFeeAccount')
        .select(
          `
          id,
          feeCurrency,
          totalAmountMinor,
          StudentFeeInstallment (
            id,
            installmentNumber,
            labelEn,
            amountMinor,
            dueOn,
            status,
            paidAmountMinor,
            paidAt
          ),
          StudentScholarship ( discountMinor )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('id', accountId)
        .maybeSingle();
      if (accountError) {
        throw accountError;
      }
      if (!account) {
        throw new Error('Fee account not found');
      }
      const installments = (account.StudentFeeInstallment ?? []) as Array<{
        id: string;
        installmentNumber: number;
        labelEn: string;
        amountMinor: number;
        dueOn: string;
        status: string;
        paidAmountMinor: number | null;
        paidAt: string | null;
      }>;
      installments.sort((a, b) => a.installmentNumber - b.installmentNumber);
      const scholarships = (account.StudentScholarship ?? []) as Array<{
        discountMinor: number;
      }>;
      const scholarshipMinor = scholarships.reduce(
        (s, x) => s + Number(x.discountMinor ?? 0),
        0,
      );
      const totals = computeFeeAccountTotals({
        totalAmountMinor: Number(account.totalAmountMinor),
        scholarshipMinor,
        installments,
      });
      return {
        currency: String(account.feeCurrency ?? 'XAF'),
        installments,
        totals,
        progress: paymentProgressPercent(totals),
      };
    },
    enabled:
      !!accountId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const handleRecordPayment = async (
    installmentId: string,
    amountMinor: number,
  ) => {
    setPayingId(installmentId);
    try {
      await recordFeePayment.mutateAsync({
        installmentId,
        amountMinor,
        paidAmountMinor: amountMinor,
        notes,
      });
      setNotes('');
    } finally {
      setPayingId(null);
    }
  };

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">
        {getQueryErrorMessage(query.error)}
      </p>
    );
  }

  if (!query.data) {
    return (
      <p className="text-sm text-muted-foreground">{t('finance.loadingInstallments')}</p>
    );
  }

  const { currency, installments, totals, progress } = query.data;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span>
            {t('finance.due')}: {formatMoneyMinor(totals.totalDueMinor, currency)}
          </span>
          <span>
            {t('finance.paid')}: {formatMoneyMinor(totals.totalPaidMinor, currency)}
          </span>
          <span className="font-medium">
            {t('finance.balance')}: {formatMoneyMinor(totals.balanceMinor, currency)}
          </span>
        </div>
        {progress !== null ? (
          <Progress value={progress} className="h-2" />
        ) : null}
        <div className="flex gap-2 print:hidden">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/finance/fees/${accountId}/invoice`}>
              {t('finance.viewInvoice')}
            </Link>
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>{t('finance.installment')}</TableHead>
            <TableHead>{t('finance.due')}</TableHead>
            <TableHead>{t('finance.amount')}</TableHead>
            <TableHead>{t('common.labels.status')}</TableHead>
            {canManage ? (
              <TableHead className="text-right">{t('common.labels.actions')}</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.installmentNumber}</TableCell>
              <TableCell>{row.labelEn}</TableCell>
              <TableCell>{row.dueOn}</TableCell>
              <TableCell>{formatMoneyMinor(row.amountMinor, currency)}</TableCell>
              <TableCell>
                <FeeStatusBadge status={row.status} dueOn={row.dueOn} />
              </TableCell>
              {canManage ? (
                <TableCell className="text-right">
                  {row.status !== 'PAID' && row.status !== 'WAIVED' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={recordFeePayment.isPending && payingId === row.id}
                      onClick={() =>
                        void handleRecordPayment(row.id, row.amountMinor)
                      }
                    >
                      {t('finance.markPaid')}
                    </Button>
                  ) : (
                    '—'
                  )}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {canManage ? (
        <div className="max-w-md print:hidden">
          <label className="text-sm font-medium">{t('finance.paymentNotes')}</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('finance.paymentNotesPlaceholder')}
            className="mt-1"
          />
        </div>
      ) : null}
    </div>
  );
}
