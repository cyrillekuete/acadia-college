'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { Search } from '@/lib/icons';
import {
  formatSubBranchNames,
  subjectTypeLabel,
} from '@/lib/acadia/subject-catalog';
import { canEditSubject } from '@/lib/acadia/subject';
import type { CatalogFilters } from '@/lib/acadia/education-system';
import { useSubjectList, type SubjectListRowView } from '@/hooks/use-subject-list';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';

export function SubjectsTable({ filters }: { filters: CatalogFilters }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data = [], isLoading, isError, error } = useSubjectList(filters);
  const { deactivateSubject } = useSubjectMutations();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return data;
    }
    return data.filter(
      (row) =>
        row.nameEn.toLowerCase().includes(q) ||
        row.nameFr.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q),
    );
  }, [data, search]);

  const columns = useMemo<ColumnDef<SubjectListRowView>[]>(
    () => [
      { accessorKey: 'nameEn', header: 'Name' },
      { accessorKey: 'code', header: 'Code' },
      {
        id: 'grouping',
        header: 'Groupings',
        cell: ({ row }) => row.original.SubjectGrouping?.nameEn?.trim() || '—',
      },
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => subjectTypeLabel(row.original.subjectType),
      },
      {
        accessorKey: 'coefficient',
        header: 'Coefficient',
        cell: ({ row }) => row.original.coefficient,
      },
      {
        id: 'subBranches',
        header: 'Sub-Branches',
        cell: ({ row }) => {
          const branches = row.original.SubjectSubBranch ?? [];
          const label = formatSubBranchNames(branches, 2);
          if (label === '—') {
            return label;
          }
          const full = branches.map((b) => b.name).join(', ');
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default truncate">{label}</span>
              </TooltipTrigger>
              <TooltipContent>{full}</TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={canEditSubject(row.original.deactivatedAt) ? 'success' : 'secondary'}>
            {canEditSubject(row.original.deactivatedAt) ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <RegistryRowActions
            onEdit={() => router.push(`/subjects/${row.original.id}/edit`)}
            onDelete={
              canEditSubject(row.original.deactivatedAt)
                ? () => {
                    if (
                      window.confirm(
                        `Deactivate subject "${row.original.nameEn}"?`,
                      )
                    ) {
                      deactivateSubject.mutate(row.original.id);
                    }
                  }
                : undefined
            }
          />
        ),
      },
    ],
    [router, deactivateSubject],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
        <h3 className="text-sm font-medium">Subjects</h3>
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
                {error instanceof Error ? error.message : 'Failed to load subjects.'}
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
