'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { aggregateRoomUsage, formatWeeklyHours } from '@/lib/acadia/resources';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { localizedText } from '@/lib/acadia/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';

export function RoomUsagePanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  const query = useQuery({
    queryKey: ['room-usage', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('TimetableSlot')
        .select(
          `
          id,
          roomId,
          dayOfWeek,
          startMinutes,
          endMinutes,
          Room!TimetableSlot_roomId_tenantId_fkey ( code, nameEn, nameFr, capacity )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!);
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const rows = useMemo(() => {
    const slots = (query.data ?? []).map((row) => ({
      id: row.id as string,
      roomId: row.roomId as string,
      dayOfWeek: Number(row.dayOfWeek),
      startMinutes: Number(row.startMinutes),
      endMinutes: Number(row.endMinutes),
    }));
    const usageMap = aggregateRoomUsage(slots);
    const roomMeta = new Map<
      string,
      { code: string; nameEn: string; nameFr: string; capacity: number | null }
    >();
    for (const row of query.data ?? []) {
      const room = unwrapRelation<{
        code?: string;
        nameEn?: string;
        nameFr?: string;
        capacity?: number | null;
      }>(row.Room);
      if (room) {
        roomMeta.set(row.roomId as string, {
          code: room.code ?? '',
          nameEn: room.nameEn ?? '',
          nameFr: room.nameFr ?? '',
          capacity: room.capacity ?? null,
        });
      }
    }
    return Array.from(usageMap.entries())
      .map(([roomId, stats]) => {
        const meta = roomMeta.get(roomId);
        return {
          roomId,
          label: meta
            ? `${meta.code} — ${localizedText(meta.nameEn, meta.nameFr)}`
            : roomId,
          capacity: meta?.capacity ?? null,
          ...stats,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [query.data]);

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  return (
    <div className="space-y-4">
      <CurrentAcademicYearBadge label="Year" />

      <RoomUsageTable data={rows} isLoading={query.isLoading} />
    </div>
  );
}

type RoomUsageRow = {
  roomId: string;
  label: string;
  capacity: number | null;
  slotCount: number;
  weeklyMinutes: number;
};

function RoomUsageTable({
  data,
  isLoading,
}: {
  data: RoomUsageRow[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'label',
    'capacity',
    'slotCount',
    'weeklyMinutes',
  ]);

  const columns = useMemo<ColumnDef<RoomUsageRow>[]>(
    () => [
      {
        accessorKey: 'label',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('resources.room')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.label}</span>
        ),
        size: 240,
        enableSorting: true,
      },
      {
        accessorKey: 'capacity',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('resources.capacity')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => row.original.capacity ?? '—',
        size: 120,
        enableSorting: true,
      },
      {
        accessorKey: 'slotCount',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('resources.weeklySlots')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => row.original.slotCount,
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'weeklyMinutes',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('resources.scheduledHours')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => formatWeeklyHours(row.original.weeklyMinutes),
        size: 160,
        enableSorting: true,
      },
    ],
    [t],
  );

  const table = useReactTable({
    data,
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

  return (
    <DataGrid
      table={table}
      recordCount={data.length}
      isLoading={isLoading}
      tableLayout={METRONIC_RESIZABLE_TABLE_LAYOUT}
      tableClassNames={{
        edgeCell: 'px-5',
      }}
    >
      <Card>
        <CardTable>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
