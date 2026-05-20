'use client';

import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search } from '@/lib/icons';
import { ReactNode, useMemo, useState } from 'react';
import { Card, CardHeader, CardTable, CardFooter } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input, InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcademicYearTableFilters } from '@/hooks/use-academic-year-table-filters';
import { useSupabaseTableList } from '@/hooks/use-supabase-table-list';

function getQueryErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (
    error !== null &&
    error !== undefined &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Failed to load records.';
}

type ColumnFilter = { column: string; value: string | number | boolean };

export function SupabaseTableList<T extends Record<string, unknown>>({
  table,
  title,
  columns,
  select = '*',
  searchKeys = [],
  rowFilter,
  toolbarExtra,
  tenantColumn = 'tenantId',
  filters: filtersProp,
  inFilters: inFiltersProp,
  scopeByAcademicYear = false,
}: {
  table: string;
  title: string;
  columns: ColumnDef<T>[];
  select?: string;
  searchKeys?: (keyof T)[];
  rowFilter?: (row: T) => boolean;
  toolbarExtra?: ReactNode;
  tenantColumn?: string;
  /** Extra Supabase `.eq` filters applied server-side. */
  filters?: ColumnFilter[];
  /** Supabase `.in` filters (e.g. examSessionId for year-scoped marks). */
  inFilters?: { column: string; values: string[] }[];
  /** When true, automatically filters by `academicYearId` from the global year context. */
  scopeByAcademicYear?: boolean;
}) {
  const yearScope = useAcademicYearTableFilters(table);
  const mergedFilters = useMemo(() => {
    const base = filtersProp ?? [];
    if (!scopeByAcademicYear) {
      return base;
    }
    return [...yearScope.filters, ...base];
  }, [filtersProp, scopeByAcademicYear, yearScope.filters]);

  const { data = [], isLoading, isError, error } = useSupabaseTableList<T>(
    table,
    select,
    tenantColumn,
    mergedFilters,
    {
      enabled: scopeByAcademicYear ? yearScope.isReady : true,
      inFilters: inFiltersProp,
    },
  );
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let rows = rowFilter ? data.filter(rowFilter) : data;
    if (!search.trim() || searchKeys.length === 0) {
      return rows;
    }
    const q = search.toLowerCase();
    return rows.filter((row) =>
      searchKeys.some((key) =>
        String(row[key] ?? '')
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [data, search, searchKeys, rowFilter]);

  const tableInstance = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const waitingForYear = scopeByAcademicYear && !yearScope.isReady;

  return (
    <Card>
      {toolbarExtra ? <div className="px-5 pt-4">{toolbarExtra}</div> : null}
      <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
        <h3 className="text-sm font-medium">{title}</h3>
        {searchKeys.length > 0 ? (
          <InputWrapper className="w-full max-w-xs">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputWrapper>
        ) : null}
      </CardHeader>
      <DataGrid table={tableInstance} recordCount={filtered.length} isLoading={isLoading || waitingForYear}>
        <CardTable>
          <ScrollArea>
            {waitingForYear ? (
              <p className="p-5 text-sm text-muted-foreground">
                Select an academic year in the header to load records.
              </p>
            ) : isError ? (
              <p className="p-5 text-sm text-destructive">
                {getQueryErrorMessage(error)}
              </p>
            ) : isLoading ? (
              <Skeleton className="m-5 h-40 w-full" />
            ) : (
              <DataGridTable />
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </DataGrid>
    </Card>
  );
}
