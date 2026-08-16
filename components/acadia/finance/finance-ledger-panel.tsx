'use client';

import { useMemo, useState } from 'react';
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
import { Plus } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import { financeLedgerTypeLabel, formatMoneyMinor } from '@/lib/acadia/finance';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { LedgerEntryFormSheet } from '@/components/acadia/finance/ledger-entry-form-sheet';
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
  const [formOpen, setFormOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CurrentAcademicYearBadge label="Year" />
        {canManage ? (
          <Button size="sm" onClick={() => setFormOpen(true)} disabled={!activeYearId}>
            <Plus className="size-4" />
            {t('finance.addEntry')}
          </Button>
        ) : null}
      </div>

      {query.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(query.error)}
        </p>
      ) : null}

      {activeYearId ? (
        <LedgerEntriesTable data={query.data ?? []} isLoading={query.isLoading} />
      ) : null}

      <LedgerEntryFormSheet open={formOpen} onOpenChange={setFormOpen} />
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
