'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Pencil, Plus, Search, Trash2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input, InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { RegistryDeleteDialog } from '@/components/acadia/academics/registry-delete-dialog';
import {
  BudgetFormSheet,
  type BudgetLineRow,
} from '@/components/acadia/finance/budget-form-sheet';
import {
  FinanceClosedYearHint,
  useFinanceYearClosed,
} from '@/components/acadia/finance/finance-year-lock';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canWriteFinance } from '@/lib/acadia/roles';
import { formatMoneyMinor } from '@/lib/acadia/finance';
import { useTranslation } from '@/hooks/useTranslation';

export function BudgetPanel() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug);
  const yearClosed = useFinanceYearClosed();
  const { activeYearId } = useActiveAcademicYear();
  const { deleteBudgetLine } = useFinanceMutations();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetLineRow | null>(null);
  const [deleting, setDeleting] = useState<BudgetLineRow | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'category',
    'budgetedMinor',
    'notes',
    'actions',
  ]);

  const query = useQuery({
    queryKey: ['finance-budget', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('FinanceBudgetLine')
        .select('id, category, budgetedMinor, currency, notes')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!)
        .order('category');
      if (error) {
        throw error;
      }
      return (data ?? []).map(
        (row) =>
          ({
            id: row.id,
            category: row.category as BudgetLineRow['category'],
            budgetedMinor: Number(row.budgetedMinor),
            currency: row.currency,
            notes: row.notes,
          }) satisfies BudgetLineRow,
      );
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (query.data ?? []).filter((row) => {
      if (!q) {
        return true;
      }
      return (
        row.category.toLowerCase().includes(q) ||
        (row.notes ?? '').toLowerCase().includes(q)
      );
    });
  }, [query.data, search]);

  const columns = useMemo<ColumnDef<BudgetLineRow>[]>(
    () => [
      {
        accessorKey: 'category',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.category')} visibility column={column} />
        ),
        size: 180,
      },
      {
        accessorKey: 'budgetedMinor',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.budgeted')} visibility column={column} />
        ),
        cell: ({ row }) =>
          formatMoneyMinor(row.original.budgetedMinor, row.original.currency),
        size: 140,
      },
      {
        accessorKey: 'notes',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.notes')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => row.original.notes || '—',
        size: 220,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('common.labels.actions')}</span>,
        cell: ({ row }) =>
          canManage ? (
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={yearClosed}
                onClick={() => {
                  setEditing(row.original);
                  setFormOpen(true);
                }}
                aria-label={t('common.buttons.edit')}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={yearClosed}
                onClick={() => setDeleting(row.original)}
                aria-label={t('common.buttons.delete')}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ) : null,
        size: 100,
        enableSorting: false,
      },
    ],
    [canManage, t, yearClosed],
  );

  const table = useReactTable({
    data: filtered,
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

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, filtered.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <CurrentAcademicYearBadge label="Year" />
          <FinanceClosedYearHint />
        </div>
        {canManage ? (
          <Button
            size="sm"
            disabled={yearClosed}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            {t('finance.addBudgetLine')}
          </Button>
        ) : null}
      </div>

      {query.isError ? (
        <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
      ) : null}

      {activeYearId ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
            <InputWrapper className="w-full max-w-sm">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder={t('finance.searchBudget')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </InputWrapper>
          </CardHeader>
          <DataGrid
            table={table}
            recordCount={filtered.length}
            isLoading={query.isLoading}
            tableLayout={METRONIC_RESIZABLE_TABLE_LAYOUT}
            tableClassNames={{ edgeCell: 'px-5' }}
          >
            <CardTable>
              {query.isLoading ? (
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
          </DataGrid>
        </Card>
      ) : null}

      <BudgetFormSheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
          }
        }}
        record={editing}
      />
      <RegistryDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        title={t('finance.deleteBudgetTitle')}
        description={
          deleting
            ? t('finance.deleteBudgetDescription', { category: deleting.category })
            : ''
        }
        pending={deleteBudgetLine.isPending}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          deleteBudgetLine.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
