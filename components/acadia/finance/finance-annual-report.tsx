'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  FEE_BUDGET_CATEGORIES,
  formatMoneyMinor,
  scholarshipMinorFromGrants,
  totalsFromFeeAccountRecord,
} from '@/lib/acadia/finance';
import { ActiveAcademicYearPrintHeader } from '@/components/acadia/academics/active-academic-year-print-header';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
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
  const { activeYearId, activeYear } = useActiveAcademicYear();

  const query = useQuery({
    queryKey: ['finance-annual', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const [
        { data: accounts, error: accountsError },
        { data: ledger, error: ledgerError },
        { data: budget, error: budgetError },
        { data: sales, error: salesError },
        { data: expenditures, error: expendituresError },
      ] = await Promise.all([
        supabase
          .from('StudentFeeAccount')
          .select(
            `
            totalAmountMinor,
            creditMinor,
            withdrawnAt,
            StudentFeeInstallment ( amountMinor, status, paidAmountMinor ),
            StudentScholarship ( discountMinor )
          `,
          )
          .eq('tenantId', tenantId!)
          .eq('academicYearId', activeYearId!),
        supabase
          .from('FinanceLedgerEntry')
          .select('entryType, amountMinor')
          .eq('tenantId', tenantId!)
          .eq('academicYearId', activeYearId!),
        supabase
          .from('FinanceBudgetLine')
          .select('category, budgetedMinor')
          .eq('tenantId', tenantId!)
          .eq('academicYearId', activeYearId!),
        supabase
          .from('FinanceSale')
          .select('totalMinor')
          .eq('tenantId', tenantId!)
          .eq('academicYearId', activeYearId!)
          .eq('status', 'COMPLETED'),
          supabase
            .from('Expenditure')
            .select('amountMinor, budgetCategory')
            .eq('tenantId', tenantId!)
            .eq('academicYearId', activeYearId!)
            .eq('status', 'PAID'),
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
      if (salesError) {
        throw salesError;
      }
      if (expendituresError) {
        throw expendituresError;
      }

      const accountTotals = (accounts ?? [])
        .filter((account) => !account.withdrawnAt)
        .map((account) =>
          totalsFromFeeAccountRecord({
            totalAmountMinor: Number(account.totalAmountMinor),
            creditMinor: account.creditMinor,
            StudentFeeInstallment: account.StudentFeeInstallment,
            StudentScholarship: account.StudentScholarship,
          }),
        );

      const scholarshipAwarded = (accounts ?? [])
        .filter((account) => !account.withdrawnAt)
        .reduce(
          (sum, account) =>
            sum + scholarshipMinorFromGrants(account.StudentScholarship),
          0,
        );

      const completedSalesMinor = (sales ?? []).reduce(
        (sum, row) => sum + Number(row.totalMinor ?? 0),
        0,
      );
      const paidExpendituresMinor = (expenditures ?? []).reduce(
        (sum, row) => sum + Number(row.amountMinor ?? 0),
        0,
      );

      const summary = aggregateFinanceSummary(
        accountTotals,
        (ledger ?? []) as Array<{ entryType: string; amountMinor: number }>,
        {
          completedSalesMinor,
          paidExpendituresMinor,
        },
      );

      const budgetByCategory = new Map<string, number>();
      for (const row of budget ?? []) {
        budgetByCategory.set(
          String(row.category),
          Number(row.budgetedMinor ?? 0),
        );
      }
      const actualByCategory = new Map<string, number>();
      actualByCategory.set('Tuition', summary.totalPaidMinor);
      actualByCategory.set('Merchandise', completedSalesMinor);
      actualByCategory.set('Scholarships', scholarshipAwarded);
      for (const row of expenditures ?? []) {
        const category = String(row.budgetCategory || 'Other');
        actualByCategory.set(
          category,
          (actualByCategory.get(category) ?? 0) + Number(row.amountMinor ?? 0),
        );
      }

      const budgetLines = FEE_BUDGET_CATEGORIES.map((category) => ({
        category,
        budgetedMinor: budgetByCategory.get(category) ?? 0,
        actualMinor: actualByCategory.get(category) ?? 0,
      })).filter((row) => row.budgetedMinor > 0 || row.actualMinor > 0);

      const totalBudgeted = (budget ?? []).reduce(
        (s, row) => s + Number(row.budgetedMinor),
        0,
      );

      return {
        yearLabel: activeYear?.label ?? activeYearId!,
        summary,
        totalBudgeted,
        budgetLines,
        scholarshipAwarded,
        ledgerCount: ledger?.length ?? 0,
        generatedAt: new Date().toISOString().slice(0, 10),
      };
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  return (
    <div className="space-y-6">
      <ActiveAcademicYearPrintHeader />
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <CurrentAcademicYearBadge label="Year" />
        {activeYearId ? (
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
                  <TableCell>Fee collections</TableCell>
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
                  <TableCell>Scholarships awarded</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyMinor(query.data.scholarshipAwarded)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Other income (sales + ledger)</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyMinor(query.data.summary.incomeMinor)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Expenses</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyMinor(query.data.summary.expenseMinor)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Net (other income − expenses)</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatMoneyMinor(query.data.summary.netMinor)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total budget</TableCell>
                  <TableCell className="text-right">
                    {query.data.totalBudgeted > 0
                      ? formatMoneyMinor(query.data.totalBudgeted)
                      : 'No budget set'}
                  </TableCell>
                </TableRow>
                {query.data.budgetLines.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="pl-6 text-muted-foreground">
                      {row.category} (budget / actual)
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoneyMinor(row.budgetedMinor)} / {formatMoneyMinor(row.actualMinor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
