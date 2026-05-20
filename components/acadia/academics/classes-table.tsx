'use client';

import { useMemo, useState } from 'react';
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { Search } from '@/lib/icons';
import {
  branchLabel,
  levelDisplayLabel,
  subSystemLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { formatDate } from '@/lib/helpers';
import { type ClassListRow, useClassList } from '@/hooks/use-class-list';
import { cn } from '@/lib/utils';

export function ClassesTable({
  filters,
  onEdit,
  onDelete,
  className,
}: {
  filters: CatalogFilters;
  onEdit: (row: ClassListRow) => void;
  onDelete: (row: ClassListRow) => void;
  className?: string;
}) {
  const [search, setSearch] = useState('');
  const { data = [], isLoading, isError, error } = useClassList({
    subSystem: filters.subSystem,
    branch: filters.branch,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return data;
    }
    return data.filter((row) => row.name.toLowerCase().includes(q));
  }, [data, search]);

  const columns = useMemo<ColumnDef<ClassListRow>[]>(
    () => [
      { accessorKey: 'name', header: 'Class Name' },
      {
        id: 'level',
        header: 'Level',
        cell: ({ row }) => levelDisplayLabel(unwrapRelation(row.original.Level)),
      },
      {
        id: 'system',
        header: 'System',
        cell: ({ row }) => subSystemLabel(row.original.subSystem),
      },
      {
        id: 'branch',
        header: 'Branch',
        cell: ({ row }) => branchLabel(row.original.branch),
      },
      {
        id: 'teacher',
        header: 'Class Teacher',
        cell: ({ row }) => {
          const staff = unwrapRelation(row.original.StaffProfile);
          const user = unwrapRelation<{ name?: string | null }>(staff?.User);
          return user?.name?.trim() || '—';
        },
      },
      {
        id: 'enrollment',
        header: 'Enrollment',
        cell: ({ row }) => row.original.enrollmentCount,
      },
      {
        id: 'subjects',
        header: 'Subjects',
        cell: ({ row }) => row.original.subjectCount,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.status === 'ACTIVE' ? 'success' : 'secondary'}>
            {row.original.status === 'ACTIVE' ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <RegistryRowActions
            onEdit={() => onEdit(row.original)}
            onDelete={() => onDelete(row.original)}
          />
        ),
      },
    ],
    [onEdit, onDelete],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
        <h3 className="text-sm font-medium">Classes</h3>
        <InputWrapper className="w-full max-w-xs">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputWrapper>
      </CardHeader>
      <DataGrid table={table} recordCount={filtered.length} isLoading={isLoading}>
        <CardTable>
          <ScrollArea>
            {isError ? (
              <p className="p-5 text-sm text-destructive">
                {error instanceof Error ? error.message : 'Failed to load classes.'}
              </p>
            ) : isLoading ? (
              <Skeleton className="m-5 h-40 w-full" />
            ) : (
              <DataGridTable />
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
      </DataGrid>
    </Card>
  );
}
