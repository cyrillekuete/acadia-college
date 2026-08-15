'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Search } from '@/lib/icons';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { SUBJECTS_TABLE_LAYOUT } from '@/components/acadia/subjects/subjects-table-layout';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input, InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import type { SubjectGroupingListRow } from '@/hooks/use-subject-grouping-list';
import { cn } from '@/lib/utils';

function truncateCell(text: string) {
  return (
    <span className="block truncate" title={text}>
      {text}
    </span>
  );
}

export function SubjectGroupingsTable({
  data,
  isLoading,
  isError,
  error,
  canManage,
  highlightId,
  onCreate,
  onEdit,
  onDelete,
}: {
  data: SubjectGroupingListRow[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  canManage: boolean;
  highlightId?: string | null;
  onCreate?: () => void;
  onEdit?: (row: SubjectGroupingListRow) => void;
  onDelete?: (row: SubjectGroupingListRow) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return data;
    }
    return data.filter((row) => {
      const haystack = [row.nameEn, row.nameFr, row.code ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search]);

  const columns = useMemo<ColumnDef<SubjectGroupingListRow>[]>(
    () => [
      {
        accessorKey: 'nameEn',
        id: 'nameEn',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.nameEn')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <span
            data-grouping-id={row.original.id}
            className={cn(
              'block truncate rounded-sm px-1 -mx-1',
              highlightId === row.original.id && 'bg-muted font-medium',
            )}
            title={row.original.nameEn}
          >
            {row.original.nameEn}
          </span>
        ),
        size: 180,
        meta: {
          headerTitle: t('common.labels.nameEn'),
          skeleton: <Skeleton className="h-4 w-36" />,
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: 'nameFr',
        id: 'nameFr',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.nameFr')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => truncateCell(row.original.nameFr),
        size: 180,
        meta: {
          headerTitle: t('common.labels.nameFr'),
          skeleton: <Skeleton className="h-4 w-36" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'code',
        id: 'code',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.code')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => truncateCell(row.original.code?.trim() || '—'),
        size: 88,
        meta: {
          headerTitle: t('common.labels.code'),
          skeleton: <Skeleton className="h-4 w-12" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'sortOrder',
        id: 'sortOrder',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.sortOrder')}
            visibility
            column={column}
            className="justify-center"
          />
        ),
        cell: ({ row }) => (
          <span className="block text-center tabular-nums">
            {row.original.sortOrder}
          </span>
        ),
        size: 88,
        meta: {
          headerTitle: t('common.labels.sortOrder'),
          skeleton: <Skeleton className="mx-auto h-4 w-8" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'subjectCount',
        id: 'subjectCount',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('subjects.title')}
            visibility
            column={column}
            className="justify-center"
          />
        ),
        cell: ({ row }) => (
          <span className="block text-center tabular-nums">
            {row.original.subjectCount}
          </span>
        ),
        size: 88,
        meta: {
          headerTitle: t('subjects.title'),
          skeleton: <Skeleton className="mx-auto h-4 w-8" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      ...(canManage && onEdit
        ? [
            {
              id: 'actions',
              header: () => (
                <span className="sr-only">{t('common.labels.actions')}</span>
              ),
              cell: ({ row }: { row: { original: SubjectGroupingListRow } }) => (
                <RegistryRowActions
                  onEdit={() => onEdit(row.original)}
                  onDelete={onDelete ? () => onDelete(row.original) : undefined}
                />
              ),
              size: 80,
              enableSorting: false,
              enableResizing: false,
              enableHiding: false,
            } satisfies ColumnDef<SubjectGroupingListRow>,
          ]
        : []),
    ],
    [canManage, highlightId, onDelete, onEdit, t],
  );

  const defaultColumnOrder = useMemo(
    () =>
      canManage && onEdit
        ? ['nameEn', 'nameFr', 'code', 'sortOrder', 'subjectCount', 'actions']
        : ['nameEn', 'nameFr', 'code', 'sortOrder', 'subjectCount'],
    [canManage, onEdit],
  );
  const [columnOrder, setColumnOrder] = useState(defaultColumnOrder);

  useEffect(() => {
    setColumnOrder(defaultColumnOrder);
  }, [defaultColumnOrder]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, data.length]);

  useEffect(() => {
    if (!highlightId) {
      return;
    }
    const index = filtered.findIndex((row) => row.id === highlightId);
    if (index < 0) {
      return;
    }
    setPagination((prev) => ({
      ...prev,
      pageIndex: Math.floor(index / prev.pageSize),
    }));
  }, [filtered, highlightId]);

  useEffect(() => {
    if (!highlightId || isLoading) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-grouping-id="${highlightId}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [highlightId, isLoading, pagination.pageIndex]);

  const table = useReactTable({
    data: filtered,
    columns,
    getRowId: (row) => row.id,
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

  const recordCount = filtered.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
        <h3 className="text-sm font-medium">{t('subjects.groupings')}</h3>
        <InputWrapper className="w-full max-w-xs">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder={t('subjects.searchGroupings')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputWrapper>
      </CardHeader>
      <DataGrid
        table={table}
        recordCount={recordCount}
        isLoading={isLoading}
        tableLayout={{
          ...SUBJECTS_TABLE_LAYOUT,
          dense: true,
        }}
        tableClassNames={{
          edgeCell: 'px-5',
        }}
        emptyMessage={t('subjects.noGroupingsYet')}
      >
        <CardTable>
          <ScrollArea>
            {isError ? (
              <p className="p-5 text-sm text-destructive">
                {error instanceof Error
                  ? error.message
                  : t('subjects.loadGroupingsFailed')}
              </p>
            ) : isLoading ? (
              <Skeleton className="m-5 h-40 w-full" />
            ) : recordCount === 0 ? (
              <div className="flex flex-col items-start gap-3 p-5">
                <p className="text-sm text-muted-foreground">
                  {data.length === 0
                    ? t('subjects.noGroupingsYet')
                    : t('subjects.noGroupingsMatch')}
                </p>
                {data.length === 0 && onCreate ? (
                  <Button type="button" size="sm" onClick={onCreate}>
                    {t('subjects.createFirstGrouping')}
                  </Button>
                ) : null}
              </div>
            ) : (
              <DataGridTable />
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        {!isError && !isLoading && recordCount > 0 ? (
          <CardFooter className="border-t">
            <DataGridPagination sizes={[10, 25, 50]} />
          </CardFooter>
        ) : null}
      </DataGrid>
    </Card>
  );
}
