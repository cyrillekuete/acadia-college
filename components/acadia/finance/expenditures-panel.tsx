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
import { Check, Eye, Pencil, Plus, Search, Trash2, Wallet, X } from '@/lib/icons';
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
import { ExpenditureFormSheet } from '@/components/acadia/finance/expenditure-form-sheet';
import { ExpenditureViewSheet } from '@/components/acadia/finance/expenditure-view-sheet';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canWriteFinance } from '@/lib/acadia/roles';
import {
  aggregateExpenditureStats,
  canApproveExpenditure,
  canDeleteExpenditure,
  canEditExpenditure,
  canMarkExpenditurePaid,
  canRejectExpenditure,
  canReopenExpenditure,
  EXPENDITURE_CATEGORIES,
  EXPENDITURE_STATUSES,
  formatMoneyMinor,
  type ExpenditureCategory,
  type ExpenditureRow,
  type ExpenditureStatus,
  type FinancePaymentMethod,
} from '@/lib/acadia/finance';
import {
  FinanceClosedYearHint,
  useFinanceYearClosed,
} from '@/components/acadia/finance/finance-year-lock';
import { useTranslation } from '@/hooks/useTranslation';

function expenditureStatusVariant(status: string) {
  if (status === 'PAID') {
    return 'success' as const;
  }
  if (status === 'REJECTED') {
    return 'destructive' as const;
  }
  if (status === 'APPROVED') {
    return 'info' as const;
  }
  return 'warning' as const;
}

export function ExpendituresPanel() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug);
  const { activeYearId } = useActiveAcademicYear();
  const {
    deleteExpenditure,
    approveExpenditure,
    markExpenditurePaid,
    rejectExpenditure,
    reopenExpenditure,
  } = useFinanceMutations();
  const yearClosed = useFinanceYearClosed();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenditureRow | null>(null);
  const [viewing, setViewing] = useState<ExpenditureRow | null>(null);
  const [deleting, setDeleting] = useState<ExpenditureRow | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'title',
    'category',
    'vendor',
    'amountMinor',
    'status',
    'paymentDate',
    'actions',
  ]);

  const query = useQuery({
    queryKey: ['finance-expenditures', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('Expenditure')
        .select(
          `
          id,
          title,
          description,
          category,
          amountMinor,
          currency,
          paymentMethod,
          paymentDate,
          vendor,
          vendorContact,
          receiptNumber,
          invoiceNumber,
          status,
          budgetCategory,
          department,
          notes
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!)
        .order('paymentDate', { ascending: false });
      if (error) {
        throw error;
      }
      return (data ?? []).map(
        (row) =>
          ({
            id: row.id,
            title: row.title,
            description: row.description,
            category: row.category as ExpenditureCategory,
            amountMinor: Number(row.amountMinor),
            currency: row.currency,
            paymentMethod: row.paymentMethod as FinancePaymentMethod | null,
            paymentDate: row.paymentDate,
            vendor: row.vendor,
            vendorContact: row.vendorContact,
            receiptNumber: row.receiptNumber,
            invoiceNumber: row.invoiceNumber,
            status: row.status as ExpenditureStatus,
            budgetCategory: row.budgetCategory,
            department: row.department,
            notes: row.notes,
          }) satisfies ExpenditureRow,
      );
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
      if (categoryFilter !== 'ALL' && row.category !== categoryFilter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        row.title.toLowerCase().includes(q) ||
        row.vendor.toLowerCase().includes(q) ||
        (row.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [categoryFilter, query.data, search, statusFilter]);

  const stats = useMemo(
    () => aggregateExpenditureStats(query.data ?? []),
    [query.data],
  );

  const columns = useMemo<ColumnDef<ExpenditureRow>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.title')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            {row.original.description ? (
              <p className="max-w-xs truncate text-xs text-muted-foreground">
                {row.original.description}
              </p>
            ) : null}
          </div>
        ),
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: 'category',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.category')} visibility column={column} />
        ),
        cell: ({ row }) => t(`finance.expenditureCategory.${row.original.category}`),
        size: 160,
        enableSorting: true,
      },
      {
        accessorKey: 'vendor',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.vendor')} visibility column={column} />
        ),
        size: 160,
        enableSorting: true,
      },
      {
        accessorKey: 'amountMinor',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.amount')} visibility column={column} />
        ),
        cell: ({ row }) =>
          formatMoneyMinor(row.original.amountMinor, row.original.currency),
        size: 130,
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
          <Badge
            variant={expenditureStatusVariant(row.original.status)}
            appearance="light"
          >
            {t(`finance.expenditureStatus.${row.original.status}`)}
          </Badge>
        ),
        size: 130,
        enableSorting: true,
      },
      {
        accessorKey: 'paymentDate',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('finance.paymentDate')}
            visibility
            column={column}
          />
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
            {canManage && canApproveExpenditure(row.original.status) ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={yearClosed}
                onClick={() => approveExpenditure.mutate(row.original.id)}
                aria-label={t('finance.approve')}
              >
                <Check className="size-4" />
              </Button>
            ) : null}
            {canManage && canRejectExpenditure(row.original.status) ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={yearClosed}
                onClick={() => rejectExpenditure.mutate(row.original.id)}
                aria-label={t('finance.reject')}
              >
                <X className="size-4" />
              </Button>
            ) : null}
            {canManage && canReopenExpenditure(row.original.status) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={yearClosed}
                onClick={() => reopenExpenditure.mutate(row.original.id)}
              >
                {t('finance.reopen')}
              </Button>
            ) : null}
            {canManage && canMarkExpenditurePaid(row.original.status) ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={yearClosed}
                onClick={() => markExpenditurePaid.mutate(row.original.id)}
                aria-label={t('finance.markPaidExpenditure')}
              >
                <Wallet className="size-4" />
              </Button>
            ) : null}
            {canManage && canEditExpenditure(row.original.status) ? (
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
            ) : null}
            {canManage && canDeleteExpenditure(row.original.status) ? (
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
          </div>
        ),
        size: 180,
        enableSorting: false,
        enableResizing: false,
        enableHiding: false,
      },
    ],
    [
      approveExpenditure,
      canManage,
      markExpenditurePaid,
      rejectExpenditure,
      reopenExpenditure,
      t,
      yearClosed,
    ],
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
  }, [search, statusFilter, categoryFilter, filtered.length]);

  const cards = [
    { label: t('finance.totalExpenditures'), value: String(stats.count) },
    {
      label: t('finance.totalExpenditureAmount'),
      value: formatMoneyMinor(stats.totalAmountMinor),
    },
    { label: t('finance.pendingApproval'), value: String(stats.pendingCount) },
    { label: t('finance.approvedCount'), value: String(stats.approvedCount) },
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
            {t('finance.addExpenditure')}
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
                placeholder={t('finance.searchExpenditures')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </InputWrapper>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('finance.allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('finance.allCategories')}</SelectItem>
                {EXPENDITURE_CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`finance.expenditureCategory.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('finance.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('finance.allStatuses')}</SelectItem>
                {EXPENDITURE_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`finance.expenditureStatus.${value}`)}
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

      <ExpenditureFormSheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
          }
        }}
        record={editing}
      />
      <ExpenditureViewSheet
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
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        title={t('finance.deleteExpenditureTitle')}
        description={
          deleting
            ? t('finance.deleteExpenditureDescription', { title: deleting.title })
            : ''
        }
        pending={deleteExpenditure.isPending}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          deleteExpenditure.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
