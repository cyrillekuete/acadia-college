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
import { BookOpen, Search, Users } from '@/lib/icons';
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
import { ACADEMIC_STRUCTURE_TABLE_LAYOUT } from '@/components/acadia/academics/academic-structure-table-layout';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useTranslation } from '@/hooks/useTranslation';

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
  onCreate,
  onEdit,
  onDelete,
  onAssignSubjects,
  onAssignTeachers,
  initialClasses,
  seedYearId,
}: {
  filters: CatalogFilters;
  onCreate?: () => void;
  onEdit?: (row: ClassListRow) => void;
  onDelete?: (row: ClassListRow) => void;
  onAssignSubjects?: (row: ClassListRow) => void;
  onAssignTeachers?: (row: ClassListRow) => void;
  initialClasses?: ClassListRow[];
  seedYearId?: string | null;
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
  const { data = [], isLoading, isError, error } = useClassList(
    {
      subSystem: filters.subSystem,
      branch: filters.branch,
    },
    initialClasses
      ? { data: initialClasses, yearId: seedYearId }
      : undefined,
  );

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
          <DataGridColumnHeader title={t('academics.className')} visibility column={column} />
        ),
        cell: ({ row }) => truncateCell(row.original.name),
        size: 150,
        enableSorting: true,
      },
      {
        id: 'level',
        accessorFn: (row) => classLevelName(row),
        header: ({ column }) => (
          <DataGridColumnHeader title={t('students.level')} visibility column={column} />
        ),
        cell: ({ row }) => truncateCell(classLevelName(row.original)),
        size: 96,
        enableSorting: true,
      },
      {
        accessorKey: 'subSystem',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('catalog.subSystemLabel')} visibility column={column} />
        ),
        cell: ({ row }) =>
          truncateCell(
            row.original.subSystem
              ? t(`catalog.subSystem.${row.original.subSystem}`)
              : '—',
          ),
        size: 68,
        enableSorting: true,
      },
      {
        accessorKey: 'branch',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('catalog.branchLabel')} visibility column={column} />
        ),
        cell: ({ row }) =>
          truncateCell(
            row.original.branch
              ? t(`catalog.branch.${row.original.branch}`)
              : '—',
          ),
        size: 84,
        enableSorting: true,
      },
      {
        id: 'teacher',
        accessorFn: (row) => classTeacherName(row),
        header: ({ column }) => (
          <DataGridColumnHeader title={t('academics.classTeacher')} visibility column={column} />
        ),
        cell: ({ row }) => truncateCell(classTeacherName(row.original)),
        size: 108,
        enableSorting: true,
      },
      {
        accessorKey: 'enrollmentCount',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('academics.enrollmentCount')}
            visibility
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
            title={t('academics.subjectsShort')}
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
        size: 52,
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('common.labels.status')} visibility column={column} />
        ),
        cell: ({ row }) => {
          const active = row.original.status === 'ACTIVE';
          return (
            <Badge
              variant={active ? 'success' : 'secondary'}
              appearance="light"
              size="sm"
            >
              {active ? t('common.labels.active') : t('common.labels.inactive')}
            </Badge>
          );
        },
        size: 76,
        enableSorting: true,
      },
      ...(canManage && onEdit
        ? [
            {
              id: 'actions',
              header: () => <span className="sr-only">{t('common.labels.actions')}</span>,
              cell: ({ row }: { row: { original: ClassListRow } }) => (
                <div className="flex justify-end gap-1">
                  {onAssignTeachers ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onAssignTeachers(row.original)}
                      aria-label={t('academics.assignTeachers')}
                    >
                      <Users className="size-4" />
                    </Button>
                  ) : null}
                  {onAssignSubjects ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onAssignSubjects(row.original)}
                      aria-label={t('academics.assignSubjects')}
                    >
                      <BookOpen className="size-4" />
                    </Button>
                  ) : null}
                  <RegistryRowActions
                    onEdit={() => onEdit(row.original)}
                    onDelete={onDelete ? () => onDelete(row.original) : undefined}
                  />
                </div>
              ),
              size: 96,
              enableSorting: false,
              enableResizing: false,
              enableHiding: false,
            } satisfies ColumnDef<ClassListRow>,
          ]
        : []),
    ],
    [canManage, onDelete, onEdit, onAssignSubjects, onAssignTeachers, t],
  );

  const defaultColumnOrder = useMemo(
    () =>
      canManage && onEdit
        ? [
            'name',
            'level',
            'subSystem',
            'branch',
            'teacher',
            'enrollmentCount',
            'subjectCount',
            'status',
            'actions',
          ]
        : [
            'name',
            'level',
            'subSystem',
            'branch',
            'teacher',
            'enrollmentCount',
            'subjectCount',
            'status',
          ],
    [canManage, onEdit],
  );
  const [columnOrder, setColumnOrder] = useState(defaultColumnOrder);

  useEffect(() => {
    setColumnOrder(defaultColumnOrder);
  }, [defaultColumnOrder]);

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
  }, [search, filters.subSystem, filters.branch, data.length]);

  const recordCount = filtered.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
        <h3 className="text-sm font-medium">{t('academics.classesTitle')}</h3>
        <InputWrapper className="w-full max-w-xs">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder={t('academics.searchClasses')}
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
          ...ACADEMIC_STRUCTURE_TABLE_LAYOUT,
          dense: true,
        }}
        emptyMessage={t('academics.noClassesMatch')}
      >
        <CardTable>
          <ScrollArea>
            {isError ? (
              <p className="p-5 text-sm text-destructive">
                {error instanceof Error ? error.message : t('academics.loadClassesFailed')}
              </p>
            ) : isLoading ? (
              <Skeleton className="m-5 h-40 w-full" />
            ) : recordCount === 0 ? (
              <div className="flex flex-col items-start gap-3 p-5">
                <p className="text-sm text-muted-foreground">
                  {data.length === 0
                    ? t('academics.noClassesYet')
                    : t('academics.noClassesMatch')}
                </p>
                {data.length === 0 && onCreate ? (
                  <Button type="button" size="sm" onClick={onCreate}>
                    {t('academics.createFirstClass')}
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
