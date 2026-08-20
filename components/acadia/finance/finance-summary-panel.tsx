'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  aggregateFinanceSummary,
  countOverdueInstallments,
  formatMoneyMinor,
  totalsFromFeeAccountRecord,
} from '@/lib/acadia/finance';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { useTranslation } from '@/hooks/useTranslation';

export function FinanceSummaryPanel() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  const query = useQuery({
    queryKey: ['finance-summary', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const [
        { data: accounts, error: accountsError },
        { data: ledger, error: ledgerError },
        { data: sales, error: salesError },
        { data: expenditures, error: expendituresError },
      ] =
        await Promise.all([
          supabase
            .from('StudentFeeAccount')
            .select(
              `
              totalAmountMinor,
              creditMinor,
              withdrawnAt,
              StudentFeeInstallment ( amountMinor, status, dueOn, paidAmountMinor ),
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
            .from('FinanceSale')
            .select('totalMinor')
            .eq('tenantId', tenantId!)
            .eq('academicYearId', activeYearId!)
            .eq('status', 'COMPLETED'),
          supabase
            .from('Expenditure')
            .select('amountMinor')
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

      let overdueInstallments = 0;
      for (const account of accounts ?? []) {
        if (account.withdrawnAt) {
          continue;
        }
        const installments = (account.StudentFeeInstallment ?? []) as Array<{
          status: string;
          dueOn: string;
        }>;
        overdueInstallments += countOverdueInstallments(installments);
      }

      const summary = aggregateFinanceSummary(
        accountTotals,
        (ledger ?? []) as Array<{ entryType: string; amountMinor: number }>,
        {
          completedSalesMinor: (sales ?? []).reduce(
            (sum, row) => sum + Number(row.totalMinor ?? 0),
            0,
          ),
          paidExpendituresMinor: (expenditures ?? []).reduce(
            (sum, row) => sum + Number(row.amountMinor ?? 0),
            0,
          ),
        },
      );
      summary.overdueInstallments = overdueInstallments;
      return summary;
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const cards = useMemo(() => {
    const s = query.data;
    if (!s) {
      return [];
    }
    return [
      { label: t('finance.feeAccounts'), value: String(s.accounts) },
      { label: t('finance.totalDue'), value: formatMoneyMinor(s.totalDueMinor) },
      { label: t('finance.feeCollections'), value: formatMoneyMinor(s.totalPaidMinor) },
      { label: t('finance.outstanding'), value: formatMoneyMinor(s.outstandingMinor) },
      { label: t('finance.overdueInstallments'), value: String(s.overdueInstallments) },
      { label: t('finance.otherIncome'), value: formatMoneyMinor(s.incomeMinor) },
      { label: t('finance.ledgerExpenses'), value: formatMoneyMinor(s.expenseMinor) },
      { label: t('finance.netLedger'), value: formatMoneyMinor(s.netMinor) },
    ];
  }, [query.data, t]);

  return (
    <div className="space-y-4">
      <CurrentAcademicYearBadge label="Year" />

      {query.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(query.error)}
        </p>
      ) : null}

      {activeYearId && query.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
