'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  aggregateFinanceSummary,
  computeFeeAccountTotals,
  formatMoneyMinor,
  isInstallmentOverdue,
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
      const [{ data: accounts, error: accountsError }, { data: ledger, error: ledgerError }] =
        await Promise.all([
          supabase
            .from('StudentFeeAccount')
            .select(
              `
              totalAmountMinor,
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
        ]);
      if (accountsError) {
        throw accountsError;
      }
      if (ledgerError) {
        throw ledgerError;
      }

      const accountTotals = (accounts ?? []).map((account) => {
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
        return computeFeeAccountTotals({
          totalAmountMinor: Number(account.totalAmountMinor),
          scholarshipMinor,
          installments,
        });
      });

      let overdueInstallments = 0;
      for (const account of accounts ?? []) {
        const installments = (account.StudentFeeInstallment ?? []) as Array<{
          status: string;
          dueOn: string;
        }>;
        overdueInstallments += installments.filter((i) =>
          isInstallmentOverdue(i.status, i.dueOn),
        ).length;
      }

      const summary = aggregateFinanceSummary(
        accountTotals,
        (ledger ?? []) as Array<{ entryType: string; amountMinor: number }>,
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
      { label: t('finance.collected'), value: formatMoneyMinor(s.totalPaidMinor) },
      { label: t('finance.outstanding'), value: formatMoneyMinor(s.outstandingMinor) },
      { label: t('finance.overdueInstallments'), value: String(s.overdueInstallments) },
      { label: t('finance.ledgerIncome'), value: formatMoneyMinor(s.incomeMinor) },
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
