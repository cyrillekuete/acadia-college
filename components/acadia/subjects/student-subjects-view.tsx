'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input, InputWrapper } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from '@/lib/icons';
import { formatSubBranchNames } from '@/lib/acadia/subject-catalog';
import type { StudentClassSubjectRow } from '@/lib/acadia/student-class-subjects';
import { useStudentClassSubjects } from '@/hooks/use-student-class-subjects';
import { useTranslation } from '@/hooks/useTranslation';

function StudentSubjectsTable({
  data,
  isLoading,
  isError,
  error,
  emptyMessage,
}: {
  data: StudentClassSubjectRow[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  emptyMessage: string;
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
    return data.filter(
      (row) =>
        row.nameEn.toLowerCase().includes(q) ||
        row.nameFr.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q),
    );
  }, [data, search]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, data.length]);

  const columns = useMemo<ColumnDef<StudentClassSubjectRow>[]>(
    () => [
      {
        accessorKey: 'nameEn',
        id: 'nameEn',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('common.labels.name')}
            visibility
            column={column}
          />
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
        size: 200,
        meta: {
          headerTitle: t('common.labels.name'),
          skeleton: <Skeleton className="h-4 w-36" />,
        },
        enableSorting: true,
        enableHiding: false,
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
        cell: ({ row }) => (
          <span className="block truncate" title={row.original.code}>
            {row.original.code}
          </span>
        ),
        size: 88,
        meta: {
          headerTitle: t('common.labels.code'),
          skeleton: <Skeleton className="h-4 w-12" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'grouping',
        accessorFn: (row) => row.groupingName ?? '—',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('subjects.grouping')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => {
          const name = row.original.groupingName;
          if (!name) {
            return '—';
          }
          return (
            <Badge variant="secondary" className="max-w-full truncate">
              {name}
            </Badge>
          );
        },
        size: 140,
        meta: {
          headerTitle: t('subjects.grouping'),
          skeleton: <Skeleton className="h-7 w-24" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'coefficient',
        id: 'coefficient',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('subjects.coefficient')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <span className="block text-center tabular-nums">
            {row.original.coefficient}
          </span>
        ),
        size: 88,
        meta: {
          headerTitle: t('subjects.coefficient'),
          skeleton: <Skeleton className="mx-auto h-4 w-8" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'subBranches',
        accessorFn: (row) => formatSubBranchNames(row.subBranches, 2),
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('subjects.subBranches')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => {
          const label = formatSubBranchNames(row.original.subBranches, 2);
          if (label === '—') {
            return label;
          }
          return (
            <span
              className="block truncate"
              title={row.original.subBranches.map((branch) => branch.name).join(', ')}
            >
              {label}
            </span>
          );
        },
        size: 160,
        meta: {
          headerTitle: t('subjects.subBranches'),
          skeleton: <Skeleton className="h-4 w-28" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getRowId: (row) => row.id,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={filtered.length}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      tableLayout={{
        columnsPinnable: true,
        columnsVisibility: true,
        width: 'fixed',
      }}
      tableClassNames={{
        edgeCell: 'px-5',
      }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
          <h3 className="text-sm font-medium">{t('subjects.myTitle')}</h3>
          <InputWrapper className="w-full max-w-xs">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder={t('subjects.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputWrapper>
        </CardHeader>
        {isError ? (
          <p className="px-5 pb-4 text-sm text-destructive">
            {error instanceof Error ? error.message : t('subjects.loadFailed')}
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

export function StudentSubjectsView() {
  const { t } = useTranslation();
  const {
    linkedProfile,
    profileLoading,
    profileError,
    subjects,
    subjectsLoading,
    subjectsError,
    subjectsErrorValue,
  } = useStudentClassSubjects();

  const studentProfileId = linkedProfile?.studentProfileId ?? null;
  const enrollment = linkedProfile?.enrollment ?? null;

  if (profileLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  if (profileError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t('subjects.profileLoadFailed')}
        </CardContent>
      </Card>
    );
  }

  if (!studentProfileId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t('subjects.noStudentProfile')}
        </CardContent>
      </Card>
    );
  }

  if (!enrollment) {
    return (
      <div className="space-y-4">
        <CurrentAcademicYearBadge />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('subjects.noEnrollment')}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <CurrentAcademicYearBadge />
        <p className="text-sm font-medium">{enrollment.className}</p>
      </div>
      <StudentSubjectsTable
        data={subjects}
        isLoading={subjectsLoading}
        isError={subjectsError}
        error={subjectsErrorValue}
        emptyMessage={t('subjects.noClassSubjects')}
      />
    </div>
  );
}
