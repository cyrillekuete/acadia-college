'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  aggregateFinanceSummary,
  computeFeeAccountTotals,
  formatMoneyMinor,
} from '@/lib/acadia/finance';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';

export function FinanceAnnualReport() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: years = [] } = useAcademicYearOptions();
  const [academicYearId, setAcademicYearId] = useState('');

  const query = useQuery({
    queryKey: ['finance-annual', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const year = years.find((y) => y.id === academicYearId);
      const [
        { data: accounts, error: accountsError },
        { data: ledger, error: ledgerError },
        { data: budget, error: budgetError },
      ] = await Promise.all([
        supabase
          .from('StudentFeeAccount')
          .select(
            `
            totalAmountMinor,
            StudentFeeInstallment ( amountMinor, status, paidAmountMinor ),
            StudentScholarship ( discountMinor )
          `,
          )
          .eq('tenantId', tenantId!)
          .eq('academicYearId', academicYearId),
        supabase
          .from('FinanceLedgerEntry')
          .select('entryType, amountMinor')
          .eq('tenantId', tenantId!)
          .eq('academicYearId', academicYearId),
        supabase
          .from('FinanceBudgetLine')
          .select('budgetedMinor')
          .eq('tenantId', tenantId!)
          .eq('academicYearId', academicYearId),
      ]);
      if (accountsError) {
        throw accountsError;
      }
      if (ledgerError) {
        throw ledgerError;
      }
      if (budgetError) {
        throw budgetError;
      }

      const accountTotals = (accounts ?? []).map((account) => {
        const installments = (account.StudentFeeInstallment ?? []) as Array<{
          amountMinor: number;
          status: string;
          paidAmountMinor: number | null;
        }>;
        const scholarships = (account.StudentScholarship ?? []) as Array<{
          discountMinor: number;
        }>;
        const scholarshipMinor = scholarships.reduce(
          (s, x) => s + Number(x.discountMinor ?? 0),
          0,
        );
        return computeFeeAccountTotals({
          totalAmountMinor: Number(account.totalAmountMinor),
          scholarshipMinor,
          installments,
        });
      });

      const summary = aggregateFinanceSummary(
        accountTotals,
        (ledger ?? []) as Array<{ entryType: string; amountMinor: number }>,
      );

      const totalBudgeted = (budget ?? []).reduce(
        (s, row) => s + Number(row.budgetedMinor),
        0,
      );

      return {
        yearLabel: year?.label ?? academicYearId,
        summary,
        totalBudgeted,
        ledgerCount: ledger?.length ?? 0,
        generatedAt: new Date().toISOString().slice(0, 10),
      };
    },
    enabled:
      !!academicYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="w-56">
          <label className="text-sm font-medium mb-1.5 block">Academic year</label>
          <Select value={academicYearId} onValueChange={setAcademicYearId}>
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {academicYearId ? (
          <Button size="sm" onClick={() => window.print()}>
            Print statement
          </Button>
        ) : null}
      </div>

      {query.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(query.error)}
        </p>
      ) : null}

      {query.data ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Year-end financial statement — {query.data.yearLabel}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Generated {query.data.generatedAt}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line item</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Student fee accounts</TableCell>
                  <TableCell className="text-right">
                    {query.data.summary.accounts}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total fees assessed</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyMinor(query.data.summary.totalDueMinor)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Collections</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyMinor(query.data.summary.totalPaidMinor)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Outstanding balances</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyMinor(query.data.summary.outstandingMinor)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Ledger income</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyMinor(query.data.summary.incomeMinor)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Ledger expenses</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyMinor(query.data.summary.expenseMinor)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Net ledger</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatMoneyMinor(query.data.summary.netMinor)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total budget</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyMinor(query.data.totalBudgeted)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
