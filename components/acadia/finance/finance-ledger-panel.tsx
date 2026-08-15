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
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import {
  financeLedgerEntrySchema,
  type FinanceLedgerEntryFormValues,
} from '@/lib/acadia/finance-schemas';
import {
  financeLedgerTypeLabel,
  formatMoneyMinor,
  parseMoneyToMinor,
} from '@/lib/acadia/finance';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
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
import { useTranslation } from '@/hooks/useTranslation';

export function FinanceLedgerPanel() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug);
  const { activeYearId } = useActiveAcademicYear();
  const { createLedgerEntry } = useFinanceMutations();

  const form = useForm<FinanceLedgerEntryFormValues>({
    resolver: zodResolver(financeLedgerEntrySchema),
    defaultValues: {
      academicYearId: '',
      entryType: 'INCOME',
      category: '',
      description: '',
      amountMinor: 0,
      currency: 'XAF',
      occurredOn: formatLocalDateInputValue(),
    },
  });

  const query = useQuery({
    queryKey: ['finance-ledger', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('FinanceLedgerEntry')
        .select('id, entryType, category, description, amountMinor, currency, occurredOn')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!)
        .order('occurredOn', { ascending: false });
      if (error) {
        throw error;
      }
      return data ?? [];
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
    await createLedgerEntry.mutateAsync({
      ...values,
      academicYearId: activeYearId!,
    });
    form.reset({
      academicYearId: activeYearId!,
      entryType: 'INCOME',
      category: '',
      description: '',
      amountMinor: 0,
      currency: 'XAF',
      occurredOn: formatLocalDateInputValue(),
    });
  });

  return (
    <div className="space-y-6">
      <CurrentAcademicYearBadge label="Year" />

      {canManage && activeYearId ? (
        <Form {...form}>
          <form
            onSubmit={onSubmit}
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <FormField
              control={form.control}
              name="entryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.labels.type')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INCOME">{t('finance.income')}</SelectItem>
                      <SelectItem value="EXPENSE">{t('finance.expense')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('finance.category')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('finance.categoryPlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amountMinor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('finance.amount')}</FormLabel>
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
              name="occurredOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.labels.date')}</FormLabel>
                  <FormControl>
                    <DatePickerInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>{t('common.labels.description')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-end">
              <Button type="submit" disabled={createLedgerEntry.isPending}>
                {createLedgerEntry.isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                {t('finance.addEntry')}
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
        <LedgerEntriesTable data={query.data ?? []} isLoading={query.isLoading} />
      ) : null}
    </div>
  );
}

type LedgerRow = {
  id: unknown;
  entryType: unknown;
  category: unknown;
  description: unknown;
  amountMinor: unknown;
  currency: unknown;
  occurredOn: unknown;
};

function LedgerEntriesTable({
  data,
  isLoading,
}: {
  data: LedgerRow[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'occurredOn',
    'entryType',
    'category',
    'description',
    'amountMinor',
  ]);

  const columns = useMemo<ColumnDef<LedgerRow>[]>(
    () => [
      {
        accessorKey: 'occurredOn',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.date')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => String(row.original.occurredOn),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'entryType',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.type')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.entryType === 'INCOME' ? 'success' : 'destructive'}
            appearance="light"
          >
            {t(`finance.entryType.${String(row.original.entryType)}`, {
              defaultValue: financeLedgerTypeLabel(String(row.original.entryType)),
            })}
          </Badge>
        ),
        size: 130,
        enableSorting: true,
      },
      {
        accessorKey: 'category',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('finance.category')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => String(row.original.category),
        size: 160,
        enableSorting: true,
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.description')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => String(row.original.description ?? '—'),
        size: 260,
        enableSorting: true,
      },
      {
        accessorKey: 'amountMinor',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('finance.amount')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {formatMoneyMinor(
              Number(row.original.amountMinor),
              String(row.original.currency ?? 'XAF'),
            )}
          </div>
        ),
        size: 140,
        enableSorting: true,
      },
    ],
    [t],
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
      tableLayout={METRONIC_RESIZABLE_TABLE_LAYOUT}
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
