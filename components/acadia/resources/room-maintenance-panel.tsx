'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { LoaderCircleIcon } from '@/lib/icons';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  roomMaintenanceSchema,
  type RoomMaintenanceFormValues,
} from '@/lib/acadia/resources-schemas';
import { roomMaintenanceStatusLabel } from '@/lib/acadia/resources';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
import { useRoomOptions } from '@/hooks/use-subject-catalog-options';
import { useResourceMutations } from '@/hooks/use-resource-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canManageResources } from '@/lib/acadia/roles';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { Skeleton } from '@/components/ui/skeleton';

export function RoomMaintenancePanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManageResources(session?.roleSlug);
  const { data: rooms = [] } = useRoomOptions();
  const { scheduleRoomMaintenance } = useResourceMutations();

  const form = useForm<RoomMaintenanceFormValues>({
    resolver: zodResolver(roomMaintenanceSchema),
    defaultValues: {
      roomId: '',
      title: '',
      description: '',
      scheduledOn: formatLocalDateInputValue(),
      status: 'SCHEDULED',
    },
  });

  const query = useQuery({
    queryKey: ['room-maintenance', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('RoomMaintenanceSchedule')
        .select(
          `
          id,
          title,
          description,
          scheduledOn,
          status,
          Room:roomId ( code, nameEn )
        `,
        )
        .eq('tenantId', tenantId!)
        .order('scheduledOn', { ascending: true });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      sessionError,
      session,
      tenantId,
    ),
  });

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  return (
    <div className="space-y-6">
      {canManage ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              scheduleRoomMaintenance.mutate(values, {
                onSuccess: () =>
                  form.reset({
                    roomId: '',
                    title: '',
                    description: '',
                    scheduledOn: formatLocalDateInputValue(),
                    status: 'SCHEDULED',
                  }),
              }),
            )}
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.code} — {room.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduledOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled date</FormLabel>
                  <FormControl>
                    <DatePickerInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        [
                          'SCHEDULED',
                          'IN_PROGRESS',
                          'COMPLETED',
                          'CANCELLED',
                        ] as const
                      ).map((value) => (
                        <SelectItem key={value} value={value}>
                          {roomMaintenanceStatusLabel(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={scheduleRoomMaintenance.isPending}
            >
              {scheduleRoomMaintenance.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Schedule maintenance
            </Button>
          </form>
        </Form>
      ) : null}

      <RoomMaintenanceTable
        data={(query.data ?? []).map((row) => {
          const room = unwrapRelation<{ code?: string; nameEn?: string }>(
            row.Room,
          );
          return {
            id: row.id as string,
            roomLabel: `${room?.code ?? ''} — ${room?.nameEn ?? ''}`,
            title: String(row.title),
            scheduledOn: String(row.scheduledOn),
            status: String(row.status),
          };
        })}
        isLoading={query.isLoading}
      />
    </div>
  );
}

type RoomMaintenanceRow = {
  id: string;
  roomLabel: string;
  title: string;
  scheduledOn: string;
  status: string;
};

function RoomMaintenanceTable({
  data,
  isLoading,
}: {
  data: RoomMaintenanceRow[];
  isLoading: boolean;
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'roomLabel',
    'title',
    'scheduledOn',
    'status',
  ]);

  const columns = useMemo<ColumnDef<RoomMaintenanceRow>[]>(
    () => [
      {
        accessorKey: 'roomLabel',
        header: ({ column }) => (
          <DataGridColumnHeader title="Room" visibility column={column} />
        ),
        cell: ({ row }) => row.original.roomLabel,
        size: 200,
        enableSorting: true,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <DataGridColumnHeader title="Title" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title}</span>
        ),
        size: 240,
        enableSorting: true,
      },
      {
        accessorKey: 'scheduledOn',
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" visibility column={column} />
        ),
        cell: ({ row }) => row.original.scheduledOn,
        size: 140,
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) => (
          <Badge variant="outline">
            {roomMaintenanceStatusLabel(row.original.status)}
          </Badge>
        ),
        size: 140,
        enableSorting: true,
      },
    ],
    [],
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
            <Skeleton className="h-40 w-full" />
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
