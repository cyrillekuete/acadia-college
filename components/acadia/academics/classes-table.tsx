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
import { branchLabel } from '@/lib/acadia/education-system';
import type { CatalogFilters } from '@/lib/acadia/education-system';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { type ClassListRow, useClassList } from '@/hooks/use-class-list';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { Badge } from '@/components/ui/badge';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { InputWrapper } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';

function subSystemTableLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return value === 'FRENCH' ? 'French' : 'English';
}

function truncateCell(text: string, className?: string) {
  return (
    <span className={`block truncate ${className ?? ''}`} title={text}>
      {text}
    </span>
  );
}

function classTeacherName(row: ClassListRow): string {
  const staff = unwrapRelation<{ User?: unknown }>(row.StaffProfile);
  const user = unwrapRelation<{ name?: string | null }>(staff?.User);
  const name = user?.name?.trim();
  return name && name.length > 0 ? name : '—';
}

function classLevelName(row: ClassListRow): string {
  const level = unwrapRelation<{ name?: string }>(row.Level);
  return level?.name?.trim() || '—';
}

export function ClassesTable({
  filters,
  onEdit,
  onDelete,
}: {
  filters: CatalogFilters;
  onEdit: (row: ClassListRow) => void;
  onDelete: (row: ClassListRow) => void;
}) {
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const { data = [], isLoading, isError, error } = useClassList({
    subSystem: filters.subSystem,
    branch: filters.branch,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => {
      const haystack = [
        row.name,
        classLevelName(row),
        row.subSystem,
        row.branch,
        classTeacherName(row),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search]);

  const columns = useMemo<ColumnDef<ClassListRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataGridColumnHeader title="Class Name" column={column} />
        ),
        cell: ({ row }) => truncateCell(row.original.name),
        size: 150,
        enableSorting: true,
      },
      {
        id: 'level',
        accessorFn: (row) => classLevelName(row),
        header: ({ column }) => (
          <DataGridColumnHeader title="Level" column={column} />
        ),
        cell: ({ row }) => truncateCell(classLevelName(row.original)),
        size: 96,
        enableSorting: true,
      },
      {
        accessorKey: 'subSystem',
        header: ({ column }) => (
          <DataGridColumnHeader title="System" column={column} />
        ),
        cell: ({ row }) =>
          truncateCell(subSystemTableLabel(row.original.subSystem)),
        size: 68,
        enableSorting: true,
      },
      {
        accessorKey: 'branch',
        header: ({ column }) => (
          <DataGridColumnHeader title="Branch" column={column} />
        ),
        cell: ({ row }) =>
          truncateCell(branchLabel(row.original.branch)),
        size: 84,
        enableSorting: true,
      },
      {
        id: 'teacher',
        accessorFn: (row) => classTeacherName(row),
        header: ({ column }) => (
          <DataGridColumnHeader title="Class Teacher" column={column} />
        ),
        cell: ({ row }) => truncateCell(classTeacherName(row.original)),
        size: 108,
        enableSorting: true,
      },
      {
        accessorKey: 'enrollmentCount',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Enrollment"
            column={column}
            className="justify-center"
          />
        ),
        cell: ({ row }) => (
          <span className="block text-center tabular-nums">
            {row.original.enrollmentCount}
          </span>
        ),
        size: 60,
        enableSorting: true,
      },
      {
        accessorKey: 'subjectCount',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Subj."
            column={column}
            className="justify-center"
          />
        ),
        cell: ({ row }) => (
          <span className="block text-center tabular-nums">
            {row.original.subjectCount}
          </span>
        ),
        size: 52,
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) => {
          const active = row.original.status === 'ACTIVE';
          return (
            <Badge
              variant={active ? 'success' : 'secondary'}
              appearance="light"
              size="sm"
            >
              {active ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
        size: 76,
        enableSorting: true,
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: () => <span className="sr-only">Actions</span>,
              cell: ({ row }: { row: { original: ClassListRow } }) => (
                <RegistryRowActions
                  onEdit={() => onEdit(row.original)}
                  onDelete={() => onDelete(row.original)}
                />
              ),
              size: 68,
              enableSorting: false,
            } satisfies ColumnDef<ClassListRow>,
          ]
        : []),
    ],
    [canManage, onDelete, onEdit],
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
        <h3 className="text-sm font-medium">Classes</h3>
        <InputWrapper className="w-full max-w-xs">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Search classes..."
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
        emptyMessage="No classes match your filters."
      >
        <CardTable className="overflow-hidden">
          {isError ? (
            <p className="p-5 text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load classes.'}
            </p>
          ) : isLoading ? (
            <Skeleton className="m-5 h-40 w-full" />
          ) : recordCount === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              No classes match your filters.
            </p>
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
