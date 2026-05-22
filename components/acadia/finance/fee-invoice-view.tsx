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
  computeFeeAccountTotals,
  formatMoneyMinor,
} from '@/lib/acadia/finance';
import { FeeStatusBadge } from '@/components/acadia/finance/fee-status-badge';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { formatRecordValue, streamLabel, unwrapRelation } from '@/lib/acadia/record-display';

export function FeeInvoiceView({ accountId }: { accountId: string }) {
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
    return <p className="text-sm text-muted-foreground">Loading invoice…</p>;
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
          Print receipt
        </Button>
      </div>

      <div className="rounded-lg border p-6 space-y-4 bg-card">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Fee invoice</h2>
            <p className="text-sm text-muted-foreground">{invoiceNumber}</p>
          </div>
          <div className="text-sm text-right">
            <p>Date: {formatRecordValue(account.createdAt)?.slice(0, 10)}</p>
            <p>Year: {year?.label ?? '—'}</p>
          </div>
        </div>

        <div className="text-sm space-y-1">
          <p>
            <span className="font-medium">Student:</span> {user?.name ?? '—'}
          </p>
          <p>
            <span className="font-medium">Registration:</span>{' '}
            {profile?.registrationNumber ?? '—'}
          </p>
          <p>
            <span className="font-medium">Program:</span>{' '}
            {streamLabel(account.subSystem as string, account.branch as string)}
          </p>
          {user?.email ? (
            <p>
              <span className="font-medium">Email:</span> {user.email}
            </p>
          ) : null}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
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
            <span>Total fees</span>
            <span>{formatMoneyMinor(Number(account.totalAmountMinor), currency)}</span>
          </div>
          {totals.scholarshipMinor > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <span>Scholarships</span>
              <span>-{formatMoneyMinor(totals.scholarshipMinor, currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold">
            <span>Amount due</span>
            <span>{formatMoneyMinor(totals.totalDueMinor, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid</span>
            <span>{formatMoneyMinor(totals.totalPaidMinor, currency)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Balance</span>
            <span>{formatMoneyMinor(totals.balanceMinor, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
