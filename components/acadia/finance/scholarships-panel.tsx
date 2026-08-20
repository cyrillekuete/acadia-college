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
import { Badge } from '@/components/ui/badge';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input, InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import { RegistryDeleteDialog } from '@/components/acadia/academics/registry-delete-dialog';
import {
  ScholarshipTypeFormSheet,
  type ScholarshipTypeRow,
} from '@/components/acadia/finance/scholarship-type-form-sheet';
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

function formatDiscount(row: ScholarshipTypeRow): string {
  if (row.discountKind === 'PERCENT_BPS') {
    return `${(Number(row.percentBps ?? 0) / 100).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}%`;
  }
  return formatMoneyMinor(Number(row.fixedAmountMinor ?? 0));
}

export function ScholarshipsPanel() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug);
  const { deleteScholarshipType } = useFinanceMutations();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScholarshipTypeRow | null>(null);
  const [deleting, setDeleting] = useState<ScholarshipTypeRow | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'nameEn',
    'nameFr',
    'discountKind',
    'value',
    'isActive',
    'actions',
  ]);

  const query = useQuery({
    queryKey: ['scholarship-types', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('ScholarshipType')
        .select(
          'id, nameEn, nameFr, discountKind, percentBps, fixedAmountMinor, isActive',
        )
        .eq('tenantId', tenantId!)
        .order('nameEn');
      if (error) {
        throw error;
      }
      return (data ?? []).map(
        (row) =>
          ({
            id: row.id,
            nameEn: row.nameEn,
            nameFr: row.nameFr,
            discountKind: row.discountKind as ScholarshipTypeRow['discountKind'],
            percentBps: row.percentBps,
            fixedAmountMinor: row.fixedAmountMinor,
            isActive: row.isActive !== false,
          }) satisfies ScholarshipTypeRow,
      );
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      sessionError,
      session,
      tenantId,
    ),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (query.data ?? []).filter((row) => {
      if (!q) {
        return true;
      }
      return (
        row.nameEn.toLowerCase().includes(q) ||
        row.nameFr.toLowerCase().includes(q)
      );
    });
  }, [query.data, search]);

  const columns = useMemo<ColumnDef<ScholarshipTypeRow>[]>(
    () => [
      {
        accessorKey: 'nameEn',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.nameEn')}
            visibility
            column={column}
          />
        ),
        size: 180,
      },
      {
        accessorKey: 'nameFr',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.nameFr')}
            visibility
            column={column}
          />
        ),
        size: 180,
      },
      {
        accessorKey: 'discountKind',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('finance.discountKind')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) =>
          row.original.discountKind === 'PERCENT_BPS'
            ? t('finance.percent')
            : t('finance.fixedAmount'),
        size: 140,
      },
      {
        id: 'value',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.amount')} visibility column={column} />
        ),
        cell: ({ row }) => formatDiscount(row.original),
        size: 120,
      },
      {
        accessorKey: 'isActive',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.status')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.isActive ? 'success' : 'secondary'}
            appearance="light"
            size="sm"
          >
            {row.original.isActive
              ? t('common.labels.active')
              : t('common.labels.inactive')}
          </Badge>
        ),
        size: 110,
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
    [canManage, t],
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
      <div className="flex flex-wrap items-center justify-end gap-3">
        {canManage ? (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            {t('finance.addScholarshipType')}
          </Button>
        ) : null}
      </div>

      {query.isError ? (
        <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
          <InputWrapper className="w-full max-w-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder={t('finance.searchScholarships')}
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

      <ScholarshipTypeFormSheet
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
        title={t('finance.deleteScholarshipTypeTitle')}
        description={
          deleting
            ? t('finance.deleteScholarshipTypeDescription', { name: deleting.nameEn })
            : ''
        }
        pending={deleteScholarshipType.isPending}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          deleteScholarshipType.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
