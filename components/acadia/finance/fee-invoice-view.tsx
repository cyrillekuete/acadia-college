'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatMoneyMinor,
  totalsFromFeeAccountRecord,
} from '@/lib/acadia/finance';
import { FeeStatusBadge } from '@/components/acadia/finance/fee-status-badge';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { formatRecordValue, streamLabel, unwrapRelation } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

export function FeeInvoiceView({ accountId }: { accountId: string }) {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const query = useQuery({
    queryKey: ['fee-invoice', tenantId, accountId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data: account, error } = await supabase
        .from('StudentFeeAccount')
        .select(
          `
          id,
          feeCurrency,
          totalAmountMinor,
          creditMinor,
          createdAt,
          StudentProfile!StudentFeeAccount_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name, email )
          ),
          AcademicYear!StudentFeeAccount_academicYearId_tenantId_fkey ( label ),
          subSystem,
          branch,
          StudentFeeInstallment (
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
      if (error) {
        throw error;
      }
      if (!account) {
        throw new Error('Fee account not found');
      }
      const installments = (account.StudentFeeInstallment ?? []) as Array<{
        installmentNumber: number;
        labelEn: string;
        amountMinor: number;
        dueOn: string;
        status: string;
        paidAmountMinor: number | null;
        paidAt: string | null;
      }>;
      installments.sort((a, b) => a.installmentNumber - b.installmentNumber);
      const totals = totalsFromFeeAccountRecord({
        totalAmountMinor: Number(account.totalAmountMinor),
        creditMinor: account.creditMinor,
        StudentFeeInstallment: installments,
        StudentScholarship: account.StudentScholarship,
      });
      return { account, installments, totals };
    },
    enabled:
      !!accountId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">
        {getQueryErrorMessage(query.error)}
      </p>
    );
  }

  if (!query.data) {
    return <p className="text-sm text-muted-foreground">{t('finance.loadingInvoice')}</p>;
  }

  const { account, installments, totals } = query.data;
  const currency = String(account.feeCurrency ?? 'XAF');
  const profile = unwrapRelation<{
    registrationNumber?: string;
    User?: unknown;
  }>(account.StudentProfile);
  const user = unwrapRelation<{ name?: string; email?: string }>(profile?.User);
  const year = unwrapRelation<{ label?: string }>(account.AcademicYear);
  const invoiceNumber = `INV-${String(account.id).slice(-8).toUpperCase()}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-end print:hidden">
        <Button size="sm" onClick={() => window.print()}>
          {t('finance.printReceipt')}
        </Button>
      </div>

      <div className="rounded-lg border p-6 space-y-4 bg-card">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t('finance.invoiceTitle')}</h2>
            <p className="text-sm text-muted-foreground">{invoiceNumber}</p>
          </div>
          <div className="text-sm text-right">
            <p>
              {t('common.labels.date')}: {formatRecordValue(account.createdAt)?.slice(0, 10)}
            </p>
            <p>
              {t('finance.year')}: {year?.label ?? '—'}
            </p>
          </div>
        </div>

        <div className="text-sm space-y-1">
          <p>
            <span className="font-medium">{t('students.student')}:</span> {user?.name ?? '—'}
          </p>
          <p>
            <span className="font-medium">{t('finance.registration')}:</span>{' '}
            {profile?.registrationNumber ?? '—'}
          </p>
          <p>
            <span className="font-medium">{t('finance.program')}:</span>{' '}
            {streamLabel(account.subSystem as string, account.branch as string)}
          </p>
          {user?.email ? (
            <p>
              <span className="font-medium">{t('common.labels.email')}:</span> {user.email}
            </p>
          ) : null}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{t('common.labels.description')}</TableHead>
              <TableHead>{t('finance.due')}</TableHead>
              <TableHead>{t('finance.amount')}</TableHead>
              <TableHead>{t('common.labels.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {installments.map((row) => (
              <TableRow key={row.installmentNumber}>
                <TableCell>{row.installmentNumber}</TableCell>
                <TableCell>{row.labelEn}</TableCell>
                <TableCell>{row.dueOn}</TableCell>
                <TableCell>{formatMoneyMinor(row.amountMinor, currency)}</TableCell>
                <TableCell>
                  <FeeStatusBadge status={row.status} dueOn={row.dueOn} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="border-t pt-4 space-y-1 text-sm max-w-xs ml-auto">
          <div className="flex justify-between">
            <span>{t('finance.totalFees')}</span>
            <span>{formatMoneyMinor(Number(account.totalAmountMinor), currency)}</span>
          </div>
          {totals.scholarshipMinor > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <span>{t('finance.scholarshipsTitle')}</span>
              <span>-{formatMoneyMinor(totals.scholarshipMinor, currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold">
            <span>{t('finance.amountDue')}</span>
            <span>{formatMoneyMinor(totals.totalDueMinor, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('finance.paid')}</span>
            <span>{formatMoneyMinor(totals.totalPaidMinor, currency)}</span>
          </div>
          {(totals.creditMinor ?? 0) > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <span>{t('finance.credit')}</span>
              <span>-{formatMoneyMinor(totals.creditMinor ?? 0, currency)}</span>
            </div>
          ) : null}
          {(totals.waivedMinor ?? 0) > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <span>{t('finance.status.WAIVED')}</span>
              <span>-{formatMoneyMinor(totals.waivedMinor ?? 0, currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold">
            <span>{t('finance.balance')}</span>
            <span>{formatMoneyMinor(totals.balanceMinor, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
