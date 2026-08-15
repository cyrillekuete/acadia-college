'use client';

import type { ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ATTENDANCE_TABLE_LAYOUT } from '@/components/acadia/attendance/attendance-table-layout';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';

export function AttendanceDataGrid<T extends object>({
  table,
  title,
  headerExtra,
  recordCount,
  isLoading = false,
  isError = false,
  error,
  emptyMessage,
  paginate = true,
}: {
  table: Table<T>;
  title?: string;
  headerExtra?: ReactNode;
  recordCount: number;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  emptyMessage?: string;
  paginate?: boolean;
}) {
  return (
    <Card>
      {title || headerExtra ? (
        <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
          {title ? <h3 className="text-sm font-medium">{title}</h3> : <span />}
          {headerExtra}
        </CardHeader>
      ) : null}
      <DataGrid
        table={table}
        recordCount={recordCount}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        tableLayout={ATTENDANCE_TABLE_LAYOUT}
      >
        <CardTable>
          <ScrollArea>
            {isError ? (
              <p className="p-5 text-sm text-destructive">
                {getQueryErrorMessage(error)}
              </p>
            ) : (
              <DataGridTable />
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        {paginate && !isError && !isLoading && recordCount > 0 ? (
          <CardFooter>
            <DataGridPagination />
          </CardFooter>
        ) : null}
      </DataGrid>
    </Card>
  );
}
