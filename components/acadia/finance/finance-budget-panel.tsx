'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
  financeBudgetLineSchema,
  type FinanceBudgetLineFormValues,
} from '@/lib/acadia/finance-schemas';
import {
  FEE_BUDGET_CATEGORIES,
  formatMoneyMinor,
  parseMoneyToMinor,
} from '@/lib/acadia/finance';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canWriteFinance } from '@/lib/acadia/roles';

export function FinanceBudgetPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug);
  const { data: years = [] } = useAcademicYearOptions();
  const [academicYearId, setAcademicYearId] = useState('');
  const { saveBudgetLine } = useFinanceMutations();

  const form = useForm<FinanceBudgetLineFormValues>({
    resolver: zodResolver(financeBudgetLineSchema),
    defaultValues: {
      academicYearId: '',
      category: 'Tuition',
      budgetedMinor: 0,
      currency: 'XAF',
      notes: '',
    },
  });

  const query = useQuery({
    queryKey: ['finance-budget', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const [{ data: budgetLines, error: budgetError }, { data: ledger, error: ledgerError }] =
        await Promise.all([
          supabase
            .from('FinanceBudgetLine')
            .select('category, budgetedMinor, currency, notes')
            .eq('tenantId', tenantId!)
            .eq('academicYearId', academicYearId),
          supabase
            .from('FinanceLedgerEntry')
            .select('category, entryType, amountMinor')
            .eq('tenantId', tenantId!)
            .eq('academicYearId', academicYearId),
        ]);
      if (budgetError) {
        throw budgetError;
      }
      if (ledgerError) {
        throw ledgerError;
      }

      const actualByCategory = new Map<string, { income: number; expense: number }>();
      for (const row of ledger ?? []) {
        const cat = String(row.category);
        const current = actualByCategory.get(cat) ?? { income: 0, expense: 0 };
        if (row.entryType === 'INCOME') {
          current.income += Number(row.amountMinor);
        } else {
          current.expense += Number(row.amountMinor);
        }
        actualByCategory.set(cat, current);
      }

      const rows = FEE_BUDGET_CATEGORIES.map((category) => {
        const budget = budgetLines?.find((b) => b.category === category);
        const actual = actualByCategory.get(category) ?? { income: 0, expense: 0 };
        const budgetedMinor = Number(budget?.budgetedMinor ?? 0);
        const netActual = actual.income - actual.expense;
        return {
          category,
          budgetedMinor,
          currency: String(budget?.currency ?? 'XAF'),
          notes: budget?.notes ?? null,
          incomeMinor: actual.income,
          expenseMinor: actual.expense,
          netActualMinor: netActual,
          varianceMinor: budgetedMinor - netActual,
        };
      });
      return rows;
    },
    enabled:
      !!academicYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  useEffect(() => {
    if (academicYearId) {
      form.setValue('academicYearId', academicYearId);
    }
  }, [academicYearId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    await saveBudgetLine.mutateAsync({
      ...values,
      academicYearId,
    });
  });

  return (
    <div className="space-y-6">
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

      {canManage && academicYearId ? (
        <Form {...form}>
          <form
            onSubmit={onSubmit}
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-4"
          >
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FEE_BUDGET_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="budgetedMinor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={field.value ? field.value / 100 : ''}
                      onChange={(e) =>
                        field.onChange(parseMoneyToMinor(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-end">
              <Button type="submit" disabled={saveBudgetLine.isPending}>
                {saveBudgetLine.isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Save budget line
              </Button>
            </div>
          </form>
        </Form>
      ) : null}

      {query.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(query.error)}
        </p>
      ) : null}

      {academicYearId && query.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Budgeted</TableHead>
              <TableHead>Income</TableHead>
              <TableHead>Expense</TableHead>
              <TableHead>Net actual</TableHead>
              <TableHead>Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map((row) => (
              <TableRow key={row.category}>
                <TableCell className="font-medium">{row.category}</TableCell>
                <TableCell>
                  {formatMoneyMinor(row.budgetedMinor, row.currency)}
                </TableCell>
                <TableCell>{formatMoneyMinor(row.incomeMinor, row.currency)}</TableCell>
                <TableCell>{formatMoneyMinor(row.expenseMinor, row.currency)}</TableCell>
                <TableCell>{formatMoneyMinor(row.netActualMinor, row.currency)}</TableCell>
                <TableCell
                  className={
                    row.varianceMinor < 0 ? 'text-destructive' : 'text-muted-foreground'
                  }
                >
                  {formatMoneyMinor(row.varianceMinor, row.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
