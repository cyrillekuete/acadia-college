'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  financeBudgetLineSchema,
  type FinanceBudgetLineFormValues,
} from '@/lib/acadia/finance-schemas';
import {
  FEE_BUDGET_CATEGORIES,
  formatMoneyMinor,
  MERCHANDISE_BUDGET_CATEGORY,
  parseMoneyToMinor,
} from '@/lib/acadia/finance';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canWriteFinance } from '@/lib/acadia/roles';

type BudgetRow = {
  category: string;
  budgetedMinor: number;
  currency: string;
  notes: string | null;
  incomeMinor: number;
  expenseMinor: number;
  netActualMinor: number;
  varianceMinor: number;
};
export function FinanceBudgetPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug);
  const { activeYearId } = useActiveAcademicYear();
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
    queryKey: ['finance-budget', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const [
        { data: budgetLines, error: budgetError },
        { data: ledger, error: ledgerError },
        { data: sales, error: salesError },
        { data: expenditures, error: expendituresError },
      ] =
        await Promise.all([
          supabase
            .from('FinanceBudgetLine')
            .select('category, budgetedMinor, currency, notes')
            .eq('tenantId', tenantId!)
            .eq('academicYearId', activeYearId!),
          supabase
            .from('FinanceLedgerEntry')
            .select('category, entryType, amountMinor')
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
      if (budgetError) {
        throw budgetError;
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
      const merchandise = actualByCategory.get(MERCHANDISE_BUDGET_CATEGORY) ?? {
        income: 0,
        expense: 0,
      };
      merchandise.income += (sales ?? []).reduce(
        (sum, row) => sum + Number(row.totalMinor ?? 0),
        0,
      );
      actualByCategory.set(MERCHANDISE_BUDGET_CATEGORY, merchandise);
      for (const row of expenditures ?? []) {
        const cat = String(row.budgetCategory || 'Other');
        const current = actualByCategory.get(cat) ?? { income: 0, expense: 0 };
        current.expense += Number(row.amountMinor ?? 0);
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
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  useEffect(() => {
    if (activeYearId) {
      form.setValue('academicYearId', activeYearId);
    }
  }, [activeYearId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    await saveBudgetLine.mutateAsync({
      ...values,
      academicYearId: activeYearId!,
    });
  });

  return (
    <div className="space-y-6">
      <CurrentAcademicYearBadge label="Year" />

      {canManage && activeYearId ? (
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

      {activeYearId ? (
        <BudgetLinesTable data={query.data ?? []} isLoading={query.isLoading} />
      ) : null}
    </div>
  );
}

function BudgetLinesTable({
  data,
  isLoading,
}: {
  data: BudgetRow[];
  isLoading: boolean;
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'category',
    'budgetedMinor',
    'incomeMinor',
    'expenseMinor',
    'netActualMinor',
    'varianceMinor',
  ]);

  const columns = useMemo<ColumnDef<BudgetRow>[]>(
    () => [
      {
        accessorKey: 'category',
        header: ({ column }) => (
          <DataGridColumnHeader title="Category" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.category}</span>
        ),
        size: 160,
        enableSorting: true,
      },
      {
        accessorKey: 'budgetedMinor',
        header: ({ column }) => (
          <DataGridColumnHeader title="Budgeted" visibility column={column} />
        ),
        cell: ({ row }) =>
          formatMoneyMinor(row.original.budgetedMinor, row.original.currency),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'incomeMinor',
        header: ({ column }) => (
          <DataGridColumnHeader title="Income" visibility column={column} />
        ),
        cell: ({ row }) =>
          formatMoneyMinor(row.original.incomeMinor, row.original.currency),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'expenseMinor',
        header: ({ column }) => (
          <DataGridColumnHeader title="Expense" visibility column={column} />
        ),
        cell: ({ row }) =>
          formatMoneyMinor(row.original.expenseMinor, row.original.currency),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'netActualMinor',
        header: ({ column }) => (
          <DataGridColumnHeader title="Net actual" visibility column={column} />
        ),
        cell: ({ row }) =>
          formatMoneyMinor(row.original.netActualMinor, row.original.currency),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'varianceMinor',
        header: ({ column }) => (
          <DataGridColumnHeader title="Variance" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span
            className={
              row.original.varianceMinor < 0
                ? 'text-destructive'
                : 'text-muted-foreground'
            }
          >
            {formatMoneyMinor(row.original.varianceMinor, row.original.currency)}
          </span>
        ),
        size: 140,
        enableSorting: true,
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination, columnOrder },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setColumnOrder,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={data.length}
      isLoading={isLoading}
      tableLayout={{
        width: 'fixed',
        columnsResizable: true,
        columnsPinnable: true,
        columnsMovable: true,
        columnsVisibility: true,
      }}
      tableClassNames={{
        edgeCell: 'px-5',
      }}
    >
      <Card>
        <CardTable>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
