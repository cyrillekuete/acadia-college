'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { MarksDataGrid } from '@/components/acadia/assessment/marks-data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { formatDateTime } from '@/lib/acadia/record-display';
import { useAcadiaCollegeSession, isAcadiaTenantQueryEnabled } from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';

const MARK_EVENTS = ['subject_mark.created', 'subject_mark.updated'] as const;

const DEFAULT_COLUMN_ORDER = ['when', 'event', 'mark', 'details'];

type AuditRow = {
  id: string;
  event: string;
  description: string | null;
  entityId: string | null;
  meta: unknown;
  createdAt: string;
};

function formatAuditDetails(row: AuditRow): string {
  if (typeof row.description === 'string' && row.description.trim()) {
    return row.description;
  }
  if (row.meta == null) {
    return '—';
  }
  if (typeof row.meta === 'string') {
    return row.meta || '—';
  }
  try {
    return JSON.stringify(row.meta);
  } catch {
    return '—';
  }
}

export function MarksAuditPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);

  const query = useQuery({
    queryKey: ['marks-audit', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('SystemLog')
        .select('id, event, description, entityId, meta, createdAt, User:userId ( name )')
        .in('event', [...MARK_EVENTS])
        .order('createdAt', { ascending: false })
        .limit(50);
      if (error) {
        throw error;
      }
      return (data ?? []) as AuditRow[];
    },
    enabled: isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  const columns = useMemo<ColumnDef<AuditRow>[]>(
    () => [
      {
        id: 'when',
        accessorFn: (row) => row.createdAt,
        header: ({ column }) => (
          <DataGridColumnHeader title="When" visibility column={column} />
        ),
        cell: ({ row }) => formatDateTime(row.original.createdAt),
        size: 180,
        enableSorting: true,
      },
      {
        accessorKey: 'event',
        header: ({ column }) => (
          <DataGridColumnHeader title="Event" visibility column={column} />
        ),
        size: 200,
        enableSorting: true,
      },
      {
        id: 'mark',
        accessorFn: (row) => row.entityId ?? '—',
        header: ({ column }) => (
          <DataGridColumnHeader title="Mark" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.entityId ?? '—'}
          </span>
        ),
        size: 160,
        enableSorting: true,
      },
      {
        id: 'details',
        accessorFn: (row) => formatAuditDetails(row),
        header: ({ column }) => (
          <DataGridColumnHeader title="Details" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-xs truncate block max-w-md">
            {formatAuditDetails(row.original)}
          </span>
        ),
        size: 320,
        enableSorting: true,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    state: { pagination, sorting, columnOrder },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Recent grade changes from the system log (FR-4.1.4).
      </p>
      <MarksDataGrid
        table={table}
        recordCount={rows.length}
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        emptyMessage="No grade changes recorded yet."
      />
    </div>
  );
}
