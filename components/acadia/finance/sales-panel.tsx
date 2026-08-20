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
import { Eye, Pencil, Plus, Search, Trash2, X } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTable, CardTitle } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input, InputWrapper } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { RegistryDeleteDialog } from '@/components/acadia/academics/registry-delete-dialog';
import { SalesFormSheet } from '@/components/acadia/finance/sales-form-sheet';
import { SalesViewSheet } from '@/components/acadia/finance/sales-view-sheet';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { canWriteFinance } from '@/lib/acadia/roles';
import {
  aggregateSalesStats,
  canCancelSale,
  canDeleteSale,
  canEditSaleNotes,
  FINANCE_SALE_ITEM_TYPES,
  FINANCE_SALE_STATUSES,
  formatMoneyMinor,
  type FinanceSaleItemType,
  type FinanceSaleRow,
  type FinanceSaleStatus,
} from '@/lib/acadia/finance';
import {
  FinanceClosedYearHint,
  useFinanceYearClosed,
} from '@/components/acadia/finance/finance-year-lock';
import { useTranslation } from '@/hooks/useTranslation';

function saleStatusVariant(status: string) {
  if (status === 'COMPLETED') {
    return 'success' as const;
  }
  if (status === 'CANCELLED') {
    return 'destructive' as const;
  }
  return 'warning' as const;
}

export function SalesPanel() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug);
  const { activeYearId } = useActiveAcademicYear();
  const { deleteSale, cancelSale } = useFinanceMutations();
  const yearClosed = useFinanceYearClosed();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [itemTypeFilter, setItemTypeFilter] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceSaleRow | null>(null);
  const [viewing, setViewing] = useState<FinanceSaleRow | null>(null);
  const [deleting, setDeleting] = useState<FinanceSaleRow | null>(null);
  const [cancelling, setCancelling] = useState<FinanceSaleRow | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'student',
    'itemName',
    'itemType',
    'quantity',
    'unitPriceMinor',
    'totalMinor',
    'saleDate',
    'status',
    'actions',
  ]);

  const query = useQuery({
    queryKey: ['finance-sales', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('FinanceSale')
        .select(
          `
          id,
          studentProfileId,
          itemType,
          itemName,
          quantity,
          unitPriceMinor,
          totalMinor,
          saleDate,
          status,
          notes,
          StudentProfile!FinanceSale_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!)
        .order('saleDate', { ascending: false });
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => {
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(row.StudentProfile);
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        return {
          id: row.id,
          studentProfileId: row.studentProfileId,
          studentLabel: row.studentProfileId
            ? `${profile?.registrationNumber ?? '—'} — ${user?.name ?? 'Student'}`
            : t('finance.walkInCustomer'),
          itemType: row.itemType as FinanceSaleItemType,
          itemName: row.itemName,
          quantity: Number(row.quantity),
          unitPriceMinor: Number(row.unitPriceMinor),
          totalMinor: Number(row.totalMinor),
          saleDate: row.saleDate,
          status: row.status as FinanceSaleStatus,
          notes: row.notes,
        } satisfies FinanceSaleRow;
      });
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const filtered = useMemo(() => {
    const rows = query.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) {
        return false;
      }
      if (itemTypeFilter !== 'ALL' && row.itemType !== itemTypeFilter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        row.studentLabel.toLowerCase().includes(q) ||
        row.itemName.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q)
      );
    });
  }, [itemTypeFilter, query.data, search, statusFilter]);

  const stats = useMemo(
    () => aggregateSalesStats(query.data ?? []),
    [query.data],
  );

  const columns = useMemo<ColumnDef<FinanceSaleRow>[]>(
    () => [
      {
        id: 'student',
        accessorFn: (row) => row.studentLabel,
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('finance.selectStudent')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => row.original.studentLabel,
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: 'itemName',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.item')} visibility column={column} />
        ),
        size: 160,
        enableSorting: true,
      },
      {
        accessorKey: 'itemType',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.itemType')} visibility column={column} />
        ),
        cell: ({ row }) => t(`finance.saleItemType.${row.original.itemType}`),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'quantity',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.quantity')} visibility column={column} />
        ),
        size: 80,
        enableSorting: true,
      },
      {
        accessorKey: 'unitPriceMinor',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.unitPrice')} visibility column={column} />
        ),
        cell: ({ row }) => formatMoneyMinor(row.original.unitPriceMinor),
        size: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'totalMinor',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.totalAmount')} visibility column={column} />
        ),
        cell: ({ row }) => formatMoneyMinor(row.original.totalMinor),
        size: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'saleDate',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.saleDate')} visibility column={column} />
        ),
        size: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.status')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Badge variant={saleStatusVariant(row.original.status)} appearance="light">
            {t(`finance.saleStatus.${row.original.status}`)}
          </Badge>
        ),
        size: 120,
        enableSorting: true,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('common.labels.actions')}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setViewing(row.original);
                setViewOpen(true);
              }}
              aria-label={t('common.buttons.view')}
            >
              <Eye className="size-4" />
            </Button>
            {canManage && canEditSaleNotes(row.original.status) ? (
              <>
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
                {canDeleteSale(row.original.status) ? (
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
                ) : null}
                {canCancelSale(row.original.status) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={yearClosed}
                    onClick={() => setCancelling(row.original)}
                    aria-label={t('finance.cancelSale')}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        ),
        size: 120,
        enableSorting: false,
        enableResizing: false,
        enableHiding: false,
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
  }, [search, statusFilter, itemTypeFilter, filtered.length]);

  const cards = [
    { label: t('finance.totalSales'), value: String(stats.count) },
    { label: t('finance.totalRevenue'), value: formatMoneyMinor(stats.revenueMinor) },
    { label: t('finance.itemsSold'), value: String(stats.itemsSold) },
    { label: t('finance.avgOrder'), value: formatMoneyMinor(stats.averageOrderMinor) },
  ];

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
            {t('finance.addSale')}
          </Button>
        ) : null}
      </div>

      {query.isError ? (
        <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
      ) : null}

      {activeYearId ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {activeYearId ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
            <InputWrapper className="w-full max-w-sm">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder={t('finance.searchSales')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </InputWrapper>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('finance.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('finance.allStatuses')}</SelectItem>
                {FINANCE_SALE_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`finance.saleStatus.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('finance.allItemTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('finance.allItemTypes')}</SelectItem>
                {FINANCE_SALE_ITEM_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`finance.saleItemType.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <SalesFormSheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
          }
        }}
        record={editing}
      />
      <SalesViewSheet
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) {
            setViewing(null);
          }
        }}
        record={viewing}
      />
      <RegistryDeleteDialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelling(null);
          }
        }}
        title={t('finance.cancelSaleTitle')}
        description={
          cancelling
            ? t('finance.cancelSaleDescription')
            : ''
        }
        pending={cancelSale.isPending}
        onConfirm={() => {
          if (!cancelling) {
            return;
          }
          cancelSale.mutate(cancelling.id, {
            onSuccess: () => setCancelling(null),
          });
        }}
      />
      <RegistryDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        title={t('finance.deleteSaleTitle')}
        description={
          deleting
            ? t('finance.deleteSaleDescription', {
                item: deleting.itemName,
                student: deleting.studentLabel,
              })
            : ''
        }
        pending={deleteSale.isPending}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          deleteSale.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
