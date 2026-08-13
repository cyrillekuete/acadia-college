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
import type { CatalogFilters } from '@/lib/acadia/education-system';
import { type LevelListRow, useLevelList } from '@/hooks/use-level-list';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { InputWrapper } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

function truncateCell(text: string) {
  return (
    <span className="block truncate" title={text}>
      {text}
    </span>
  );
}

export function LevelsTable({
  filters,
  onCreate,
  onEdit,
  onDelete,
}: {
  filters: CatalogFilters;
  onCreate?: () => void;
  onEdit?: (row: LevelListRow) => void;
  onDelete?: (row: LevelListRow) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const { data = [], isLoading, isError, error } = useLevelList({
    subSystem: filters.subSystem,
    branch: filters.branch,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => {
      const haystack = [row.name, row.subSystem, row.branch]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search]);

  const columns = useMemo<ColumnDef<LevelListRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('academics.levelName')} column={column} />
        ),
        cell: ({ row }) => truncateCell(row.original.name),
        size: 200,
        enableSorting: true,
      },
      {
        accessorKey: 'subSystem',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('catalog.subSystemLabel')} column={column} />
        ),
        cell: ({ row }) =>
          truncateCell(
            row.original.subSystem
              ? t(`catalog.subSystem.${row.original.subSystem}`)
              : '—',
          ),
        size: 88,
        enableSorting: true,
      },
      {
        accessorKey: 'branch',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('catalog.branchLabel')} column={column} />
        ),
        cell: ({ row }) =>
          truncateCell(
            row.original.branch
              ? t(`catalog.branch.${row.original.branch}`)
              : '—',
          ),
        size: 100,
        enableSorting: true,
      },
      {
        accessorKey: 'classCount',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('academics.classesTitle')}
            column={column}
            className="justify-center"
          />
        ),
        cell: ({ row }) => (
          <span className="block text-center tabular-nums">
            {row.original.classCount}
          </span>
        ),
        size: 72,
        enableSorting: true,
      },
      ...(canManage && onEdit
        ? [
            {
              id: 'actions',
              header: () => <span className="sr-only">{t('common.labels.actions')}</span>,
              cell: ({ row }: { row: { original: LevelListRow } }) => (
                <RegistryRowActions
                  onEdit={() => onEdit(row.original)}
                  onDelete={onDelete ? () => onDelete(row.original) : undefined}
                />
              ),
              size: 68,
              enableSorting: false,
            } satisfies ColumnDef<LevelListRow>,
          ]
        : []),
    ],
    [canManage, onDelete, onEdit, t],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, filters.subSystem, filters.branch, data.length]);

  const recordCount = filtered.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
        <h3 className="text-sm font-medium">{t('academics.levelsTitle')}</h3>
        <InputWrapper className="w-full max-w-xs">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder={t('academics.searchLevels')}
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
          width: 'fixed',
          dense: true,
          columnsPinnable: false,
          columnsMovable: false,
          columnsVisibility: false,
        }}
        emptyMessage={t('academics.noLevelsMatch')}
      >
        <CardTable className="overflow-hidden">
          {isError ? (
            <p className="p-5 text-sm text-destructive">
              {error instanceof Error ? error.message : t('academics.loadLevelsFailed')}
            </p>
          ) : isLoading ? (
            <Skeleton className="m-5 h-40 w-full" />
          ) : recordCount === 0 ? (
            <div className="flex flex-col items-start gap-3 p-5">
              <p className="text-sm text-muted-foreground">
                {data.length === 0
                  ? t('academics.noLevelsYet')
                  : t('academics.noLevelsMatch')}
              </p>
              {data.length === 0 && onCreate ? (
                <Button type="button" size="sm" onClick={onCreate}>
                  {t('academics.createFirstLevel')}
                </Button>
              ) : null}
            </div>
          ) : (
            <DataGridTable />
          )}
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
