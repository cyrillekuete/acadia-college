'use client';

import { useMemo } from 'react';
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
import {
  computeFeeAccountTotals,
  formatMoneyMinor,
  isInstallmentOverdue,
} from '@/lib/acadia/finance';
import { FeeStatusBadge } from '@/components/acadia/finance/fee-status-badge';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';

type OutstandingRow = {
  accountId: string;
  studentName: string;
  registrationNumber: string;
  balanceMinor: number;
  currency: string;
  overdueCount: number;
  nextDueOn: string | null;
};

export function FeeOutstandingPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  const query = useQuery({
    queryKey: ['fee-outstanding', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data: accounts, error } = await supabase
        .from('StudentFeeAccount')
        .select(
          `
          id,
          feeCurrency,
          totalAmountMinor,
          StudentProfile!StudentFeeAccount_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          ),
          StudentFeeInstallment (
            amountMinor,
            status,
            dueOn,
            paidAmountMinor
          ),
          StudentScholarship ( discountMinor )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!);
      if (error) {
        throw error;
      }

      const rows: OutstandingRow[] = [];
      for (const account of accounts ?? []) {
        const installments = (account.StudentFeeInstallment ?? []) as Array<{
          amountMinor: number;
          status: string;
          dueOn: string;
          paidAmountMinor: number | null;
        }>;
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
        if (totals.balanceMinor <= 0) {
          continue;
        }
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(account.StudentProfile);
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        const overdueCount = installments.filter((i) =>
          isInstallmentOverdue(i.status, i.dueOn),
        ).length;
        const pendingDue = installments
          .filter((i) => i.status !== 'PAID' && i.status !== 'WAIVED')
          .map((i) => i.dueOn)
          .sort();
        rows.push({
          accountId: account.id as string,
          studentName: user?.name ?? '—',
          registrationNumber: profile?.registrationNumber ?? '—',
          balanceMinor: totals.balanceMinor,
          currency: String(account.feeCurrency ?? 'XAF'),
          overdueCount,
          nextDueOn: pendingDue[0] ?? null,
        });
      }
      rows.sort((a, b) => b.balanceMinor - a.balanceMinor);
      return rows;
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const totalOutstanding = useMemo(
    () => (query.data ?? []).reduce((s, r) => s + r.balanceMinor, 0),
    [query.data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <CurrentAcademicYearBadge />
        {activeYearId ? (
          <p className="text-sm text-muted-foreground pb-2">
            Outstanding: {formatMoneyMinor(totalOutstanding)}
          </p>
        ) : null}
      </div>

      {query.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(query.error)}
        </p>
      ) : null}

      {activeYearId && !query.isLoading && (query.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No outstanding balances.</p>
      ) : null}

      {query.data && query.data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Reg. #</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Next due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map((row) => (
              <TableRow key={row.accountId}>
                <TableCell>
                  <Link
                    href={`/finance/fees/${row.accountId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.studentName}
                  </Link>
                </TableCell>
                <TableCell>{row.registrationNumber}</TableCell>
                <TableCell>{formatMoneyMinor(row.balanceMinor, row.currency)}</TableCell>
                <TableCell>{row.nextDueOn ?? '—'}</TableCell>
                <TableCell>
                  {row.overdueCount > 0 ? (
                    <FeeStatusBadge status="OVERDUE" />
                  ) : (
                    <FeeStatusBadge status="PENDING" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
