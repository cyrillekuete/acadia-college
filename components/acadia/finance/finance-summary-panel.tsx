'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  aggregateFinanceSummary,
  computeFeeAccountTotals,
  formatMoneyMinor,
  isInstallmentOverdue,
} from '@/lib/acadia/finance';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';

export function FinanceSummaryPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: years = [] } = useAcademicYearOptions();
  const [academicYearId, setAcademicYearId] = useState('');

  const query = useQuery({
    queryKey: ['finance-summary', tenantId, academicYearId],
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
            .eq('academicYearId', academicYearId),
          supabase
            .from('FinanceLedgerEntry')
            .select('entryType, amountMinor')
            .eq('tenantId', tenantId!)
            .eq('academicYearId', academicYearId),
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
      !!academicYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const cards = useMemo(() => {
    const s = query.data;
    if (!s) {
      return [];
    }
    return [
      { label: 'Fee accounts', value: String(s.accounts) },
      { label: 'Total due', value: formatMoneyMinor(s.totalDueMinor) },
      { label: 'Collected', value: formatMoneyMinor(s.totalPaidMinor) },
      { label: 'Outstanding', value: formatMoneyMinor(s.outstandingMinor) },
      { label: 'Overdue installments', value: String(s.overdueInstallments) },
      { label: 'Ledger income', value: formatMoneyMinor(s.incomeMinor) },
      { label: 'Ledger expenses', value: formatMoneyMinor(s.expenseMinor) },
      { label: 'Net (ledger)', value: formatMoneyMinor(s.netMinor) },
    ];
  }, [query.data]);

  return (
    <div className="space-y-4">
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

      {query.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(query.error)}
        </p>
      ) : null}

      {academicYearId && query.data ? (
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
