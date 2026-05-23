'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { InputWrapper } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search } from '@/lib/icons';
import {
  branchLabel,
  subSystemLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { formatSubBranchNames } from '@/lib/acadia/subject-catalog';
import {
  canEditSubject,
  rowMatchesSubjectListFilters,
  type SubjectListFilters,
} from '@/lib/acadia/subject';
import {
  formatSubjectLevelsLabel,
  levelLabel,
} from '@/lib/acadia/record-display';
import { useSubjectList, type SubjectListRowView } from '@/hooks/use-subject-list';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';

function truncateCell(text: string) {
  return (
    <span className="block truncate" title={text}>
      {text}
    </span>
  );
}

function subjectLevelLabel(row: SubjectListRowView): string {
  const levels = (row.SubjectLevel ?? [])
    .map((sl) => sl.Level)
    .filter((l): l is NonNullable<typeof l> => l != null);
  if (levels.length === 0) {
    return levelLabel(row.Level);
  }
  return formatSubjectLevelsLabel(row.Level, levels);
}

const SUBJECT_TABLE_BASE_COLUMN_ORDER = [
  'nameEn',
  'code',
  'subSystem',
  'branch',
  'level',
  'grouping',
  'coefficient',
  'subBranches',
  'status',
] as const;

function subjectTableColumnOrder(canManage: boolean): string[] {
  return canManage
    ? [...SUBJECT_TABLE_BASE_COLUMN_ORDER, 'actions']
    : [...SUBJECT_TABLE_BASE_COLUMN_ORDER];
}

export function SubjectsTable({
  catalogFilters,
  listFilters,
  emptyMessage,
  onAssignToClasses,
}: {
  catalogFilters: CatalogFilters;
  listFilters: SubjectListFilters;
  emptyMessage?: string;
  onAssignToClasses?: (row: SubjectListRowView) => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const defaultColumnOrder = useMemo(
    () => subjectTableColumnOrder(canManage),
    [canManage],
  );
  const [columnOrder, setColumnOrder] = useState(defaultColumnOrder);

  useEffect(() => {
    setColumnOrder(defaultColumnOrder);
  }, [defaultColumnOrder]);
  const { data = [], isLoading, isError, error } = useSubjectList(catalogFilters);
  const { deactivateSubject, reactivateSubject } = useSubjectMutations();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((row) => rowMatchesSubjectListFilters(row, listFilters))
      .filter((row) => {
        if (!q) {
          return true;
        }
        return (
          row.nameEn.toLowerCase().includes(q) ||
          row.nameFr.toLowerCase().includes(q) ||
          row.code.toLowerCase().includes(q)
        );
      });
  }, [data, listFilters, search]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, listFilters, catalogFilters.subSystem, catalogFilters.branch, data.length]);

  const columns = useMemo<ColumnDef<SubjectListRowView>[]>(() => {
    const base: ColumnDef<SubjectListRowView>[] = [
      {
        accessorKey: 'nameEn',
        id: 'nameEn',
        header: ({ column }) => (
          <DataGridColumnHeader title="Name" visibility column={column} />
        ),
        cell: ({ row }) => (
          <Link
            href={`/subjects/${row.original.id}`}
            className="block truncate font-medium text-primary hover:underline"
            title={row.original.nameEn}
          >
            {row.original.nameEn}
          </Link>
        ),
        size: 180,
        meta: {
          headerTitle: 'Name',
          skeleton: <Skeleton className="h-4 w-36" />,
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: 'code',
        id: 'code',
        header: ({ column }) => (
          <DataGridColumnHeader title="Code" visibility column={column} />
        ),
        cell: ({ row }) => truncateCell(row.original.code),
        size: 72,
        meta: {
          headerTitle: 'Code',
          skeleton: <Skeleton className="h-4 w-12" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'subSystem',
        accessorFn: (row) =>
          row.subSystem ? subSystemLabel(row.subSystem) : '—',
        header: ({ column }) => (
          <DataGridColumnHeader title="Subsystem" visibility column={column} />
        ),
        cell: ({ row }) =>
          row.original.subSystem
            ? truncateCell(subSystemLabel(row.original.subSystem))
            : '—',
        size: 88,
        meta: {
          headerTitle: 'Subsystem',
          skeleton: <Skeleton className="h-4 w-16" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'branch',
        accessorFn: (row) => (row.branch ? branchLabel(row.branch) : '—'),
        header: ({ column }) => (
          <DataGridColumnHeader title="Branch" visibility column={column} />
        ),
        cell: ({ row }) =>
          row.original.branch
            ? truncateCell(branchLabel(row.original.branch))
            : '—',
        size: 88,
        meta: {
          headerTitle: 'Branch',
          skeleton: <Skeleton className="h-4 w-16" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'level',
        accessorFn: (row) => subjectLevelLabel(row),
        header: ({ column }) => (
          <DataGridColumnHeader title="Level" visibility column={column} />
        ),
        cell: ({ row }) => truncateCell(subjectLevelLabel(row.original)),
        size: 100,
        meta: {
          headerTitle: 'Level',
          skeleton: <Skeleton className="h-4 w-20" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'grouping',
        accessorFn: (row) => row.SubjectGrouping?.nameEn?.trim() ?? '—',
        header: ({ column }) => (
          <DataGridColumnHeader title="Grouping" visibility column={column} />
        ),
        cell: ({ row }) => {
          const grouping = row.original.SubjectGrouping;
          const name = grouping?.nameEn?.trim();
          if (!name || !grouping?.id) {
            return '—';
          }
          return (
            <Link
              href={`/subjects/groupings?highlight=${grouping.id}`}
              className="inline-flex max-w-full"
              title={name}
            >
              <Badge variant="secondary" className="max-w-full truncate">
                {name}
              </Badge>
            </Link>
          );
        },
        size: 120,
        meta: {
          headerTitle: 'Grouping',
          skeleton: <Skeleton className="h-7 w-24" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'coefficient',
        id: 'coefficient',
        header: ({ column }) => (
          <DataGridColumnHeader title="Coefficient" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="block text-center tabular-nums">
            {row.original.coefficient}
          </span>
        ),
        size: 72,
        meta: {
          headerTitle: 'Coefficient',
          skeleton: <Skeleton className="mx-auto h-4 w-8" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'subBranches',
        accessorFn: (row) => formatSubBranchNames(row.SubjectSubBranch ?? [], 2),
        header: ({ column }) => (
          <DataGridColumnHeader title="Sub-Branches" visibility column={column} />
        ),
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
                <span className="block cursor-default truncate" title={full}>
                  {label}
                </span>
              </TooltipTrigger>
              <TooltipContent>{full}</TooltipContent>
            </Tooltip>
          );
        },
        size: 140,
        meta: {
          headerTitle: 'Sub-Branches',
          skeleton: <Skeleton className="h-4 w-28" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'status',
        accessorFn: (row) =>
          canEditSubject(row.deactivatedAt) ? 'Active' : 'Inactive',
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) => (
          <Badge variant={canEditSubject(row.original.deactivatedAt) ? 'success' : 'secondary'}>
            {canEditSubject(row.original.deactivatedAt) ? 'Active' : 'Inactive'}
          </Badge>
        ),
        size: 88,
        meta: {
          headerTitle: 'Status',
          skeleton: <Skeleton className="h-7 w-16" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
    ];

    if (canManage) {
      base.push({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const isActive = canEditSubject(row.original.deactivatedAt);
          if (!isActive) {
            return (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    window.confirm(
                      `Reactivate subject "${row.original.nameEn}"?`,
                    )
                  ) {
                    reactivateSubject.mutate(row.original.id);
                  }
                }}
              >
                Reactivate
              </Button>
            );
          }
          return (
            <RegistryRowActions
              onAssign={
                onAssignToClasses ? () => onAssignToClasses(row.original) : undefined
              }
              onEdit={() => router.push(`/subjects/${row.original.id}/edit`)}
              onDelete={() => {
                if (
                  window.confirm(`Deactivate subject "${row.original.nameEn}"?`)
                ) {
                  deactivateSubject.mutate(row.original.id);
                }
              }}
            />
          );
        },
        size: 80,
        meta: {
          skeleton: <Skeleton className="h-8 w-16" />,
        },
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
      });
    }

    return base;
  }, [router, deactivateSubject, reactivateSubject, canManage, onAssignToClasses]);

  const table = useReactTable({
    data: filtered,
    columns,
    getRowId: (row) => row.id,
    state: {
      pagination,
      sorting,
      columnOrder,
    },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const recordCount = filtered.length;

  return (
    <DataGrid
      table={table}
      recordCount={recordCount}
      isLoading={isLoading}
      emptyMessage={emptyMessage ?? 'No subjects match the current filters.'}
      tableLayout={{
        columnsResizable: true,
        columnsPinnable: true,
        columnsMovable: true,
        columnsVisibility: true,
        width: 'fixed',
      }}
      tableClassNames={{
        edgeCell: 'px-5',
      }}
    >
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
        {isError ? (
          <p className="px-5 pb-4 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load subjects.'}
          </p>
        ) : null}
        <CardTable className="overflow-x-hidden">
          <DataGridTable />
        </CardTable>
        {!isError ? (
          <CardFooter>
            <DataGridPagination />
          </CardFooter>
        ) : null}
      </Card>
    </DataGrid>
  );
}
