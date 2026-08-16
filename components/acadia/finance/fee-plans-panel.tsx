'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Eye, Pencil, Plus, Search, Trash2 } from '@/lib/icons';
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
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { RegistryDeleteDialog } from '@/components/acadia/academics/registry-delete-dialog';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { FeePlanFormSheet } from '@/components/acadia/finance/fee-plan-form-sheet';
import { FeePlanViewSheet } from '@/components/acadia/finance/fee-plan-view-sheet';
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
  formatMoneyMinor,
  toFeePlanRow,
  type FeePlanClassRef,
  type FeePlanRow,
} from '@/lib/acadia/finance';
import { parseLocalDateInputValue } from '@/lib/acadia/dates';
import {
  EMPTY_CATALOG_FILTERS,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { useTranslation } from '@/hooks/useTranslation';

const CLASS_BADGE_LIMIT = 2;

function formatDueOn(value: string | null): string {
  if (!value) {
    return '—';
  }
  const date = parseLocalDateInputValue(value);
  return date ? date.toLocaleDateString() : value;
}

export function FeePlansPanel() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug);
  const { activeYearId } = useActiveAcademicYear();
  const { deleteStreamFeePlan } = useFinanceMutations();
  const [search, setSearch] = useState('');
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<FeePlanRow | null>(null);
  const [viewing, setViewing] = useState<FeePlanRow | null>(null);
  const [deleting, setDeleting] = useState<FeePlanRow | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'classes',
    'installmentCount',
    'totalMinor',
    'firstDueOn',
    'actions',
  ]);

  const query = useQuery({
    queryKey: ['fee-plans', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StreamFeePlan')
        .select(
          `
          id,
          academicYearId,
          subSystem,
          branch,
          installments,
          StreamFeePlanClass!StreamFeePlanClass_streamFeePlanId_tenantId_fkey (
            classId,
            Class!StreamFeePlanClass_classId_tenantId_fkey (
              id,
              name,
              subSystem,
              branch
            )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!);
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => {
        const assignments = Array.isArray(row.StreamFeePlanClass)
          ? row.StreamFeePlanClass
          : row.StreamFeePlanClass
            ? [row.StreamFeePlanClass]
            : [];
        const classes: FeePlanClassRef[] = assignments
          .map((assignment) => {
            const cls = unwrapRelation<{ id?: string; name?: string }>(
              assignment.Class,
            );
            if (!cls?.id) {
              return null;
            }
            return { id: cls.id, name: cls.name?.trim() || cls.id };
          })
          .filter((value): value is FeePlanClassRef => value !== null)
          .sort((a, b) => a.name.localeCompare(b.name));
        return toFeePlanRow({
          id: row.id as string,
          academicYearId: (row.academicYearId as string | null) ?? null,
          subSystem: row.subSystem as string,
          branch: row.branch as string,
          installments: row.installments,
          classes,
        });
      });
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (query.data ?? []).filter((row) => {
      if (catalogFilters.subSystem && row.subSystem !== catalogFilters.subSystem) {
        return false;
      }
      if (catalogFilters.branch && row.branch !== catalogFilters.branch) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return row.classes.some((cls) => cls.name.toLowerCase().includes(needle));
    });
  }, [query.data, search, catalogFilters]);

  const openView = useCallback((row: FeePlanRow) => {
    setViewing(row);
    setViewOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<FeePlanRow>[]>(
    () => [
      {
        id: 'classes',
        accessorFn: (row) => row.classes.map((cls) => cls.name).join(', '),
        header: ({ column }) => (
          <DataGridColumnHeader title={t('nav.classes')} visibility column={column} />
        ),
        cell: ({ row }) => {
          const classes = row.original.classes;
          if (classes.length === 0) {
            return (
              <button
                type="button"
                className="text-left text-sm text-muted-foreground"
                onClick={() => openView(row.original)}
              >
                {t('finance.noClassesAssigned')}
              </button>
            );
          }
          const visible = classes.slice(0, CLASS_BADGE_LIMIT);
          const extra = classes.length - visible.length;
          return (
            <button
              type="button"
              className="flex flex-wrap items-center gap-1.5 text-left"
              onClick={() => openView(row.original)}
            >
              {visible.map((cls) => (
                <Badge key={cls.id} variant="secondary" appearance="light">
                  {cls.name}
                </Badge>
              ))}
              {extra > 0 ? (
                <Badge variant="outline" appearance="light">
                  +{extra}
                </Badge>
              ) : null}
            </button>
          );
        },
        size: 280,
        enableSorting: true,
      },
      {
        id: 'installmentCount',
        accessorFn: (row) => row.installments.length,
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('finance.installments')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => row.original.installments.length,
        size: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'totalMinor',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('finance.totalAmount')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => formatMoneyMinor(row.original.totalMinor),
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'firstDueOn',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('finance.due')} visibility column={column} />
        ),
        cell: ({ row }) => formatDueOn(row.original.firstDueOn),
        size: 140,
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
              onClick={() => openView(row.original)}
              aria-label={t('common.buttons.view')}
            >
              <Eye className="size-4" />
            </Button>
            {canManage ? (
              <>
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
    [canManage, openView, t],
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
  }, [search, catalogFilters, filtered.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <CurrentAcademicYearBadge label="Year" />
          <CatalogFilterBar
            filters={catalogFilters}
            onChange={setCatalogFilters}
            className="mb-0"
          />
        </div>
        {canManage ? (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            {t('finance.addFeePlan')}
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
                placeholder={t('finance.searchFeePlans')}
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
      ) : (
        <p className="text-sm text-muted-foreground">{t('finance.selectYearFirst')}</p>
      )}

      <FeePlanFormSheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
          }
        }}
        record={editing}
      />
      <FeePlanViewSheet
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) {
            setViewing(null);
          }
        }}
        record={viewing}
        onEdit={
          canManage
            ? (row) => {
                setViewOpen(false);
                setViewing(null);
                setEditing(row);
                setFormOpen(true);
              }
            : undefined
        }
      />
      <RegistryDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        title={t('finance.deleteFeePlanTitle')}
        description={
          deleting
            ? t('finance.deleteFeePlanDescription', {
                classes:
                  deleting.classes.map((row) => row.name).join(', ') ||
                  t('finance.noClassesAssigned'),
              })
            : ''
        }
        pending={deleteStreamFeePlan.isPending}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          deleteStreamFeePlan.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
