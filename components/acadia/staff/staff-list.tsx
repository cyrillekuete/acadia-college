'use client';

import { useMemo, useState } from 'react';
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
import { ChevronRight } from '@/lib/icons';
import { getInitials } from '@/lib/helpers';
import {
  staffSubsystemDisplayLabel,
  type StaffListRow,
} from '@/lib/acadia/staff-registry';
import { getStaffActiveStatusProps } from '@/components/acadia/staff/staff-list-status';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge, BadgeDot, BadgeProps } from '@/components/ui/badge';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

const VISIBLE_SUBJECT_BADGES = 2;

export function StaffList({
  staff,
  isLoading = false,
}: {
  staff: StaffListRow[];
  isLoading?: boolean;
}) {
  const router = useRouter();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<StaffListRow>[]>(
    () => [
      {
        id: 'teacher',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Teacher" visibility column={column} />
        ),
        cell: ({ row }) => {
          const teacher = row.original;
          const initials = getInitials(teacher.name || teacher.email || '');

          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                {teacher.avatar ? (
                  <AvatarImage src={teacher.avatar} alt={teacher.name} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-px">
                <div className="text-sm font-medium">{teacher.name}</div>
                {teacher.email ? (
                  <div className="text-xs text-muted-foreground">
                    {teacher.email}
                  </div>
                ) : null}
              </div>
            </div>
          );
        },
        size: 300,
        meta: {
          headerTitle: 'Teacher',
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ),
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: 'staffCode',
        id: 'teacher_id',
        header: ({ column }) => (
          <DataGridColumnHeader title="Teacher ID" visibility column={column} />
        ),
        cell: (info) => (info.getValue() as string | null) ?? '—',
        size: 140,
        meta: {
          headerTitle: 'Teacher ID',
          skeleton: <Skeleton className="h-7 w-20" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'subsystem',
        accessorFn: (row) =>
          staffSubsystemDisplayLabel(row.subsystem, row.subsystems),
        header: ({ column }) => (
          <DataGridColumnHeader title="Subsystem" visibility column={column} />
        ),
        cell: ({ row }) => {
          const label = staffSubsystemDisplayLabel(
            row.original.subsystem,
            row.original.subsystems,
          );
          if (label === '—') {
            return <span className="text-muted-foreground">—</span>;
          }
          return <Badge variant="outline">{label}</Badge>;
        },
        size: 150,
        meta: {
          headerTitle: 'Subsystem',
          skeleton: <Skeleton className="h-7 w-24" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'subjects',
        accessorFn: (row) => row.subjects.join(', '),
        header: ({ column }) => (
          <DataGridColumnHeader title="Subjects" visibility column={column} />
        ),
        cell: ({ row }) => {
          const subjects = row.original.subjects;
          if (subjects.length === 0) {
            return <span className="text-muted-foreground">—</span>;
          }

          const visible = subjects.slice(0, VISIBLE_SUBJECT_BADGES);
          const overflow = subjects.length - visible.length;

          return (
            <div className="flex flex-wrap items-center gap-1">
              {visible.map((subject) => (
                <Badge key={subject} variant="secondary" size="sm">
                  {subject}
                </Badge>
              ))}
              {overflow > 0 ? (
                <span className="text-xs text-muted-foreground">+{overflow}</span>
              ) : null}
            </div>
          );
        },
        size: 220,
        meta: {
          headerTitle: 'Subjects',
          skeleton: <Skeleton className="h-7 w-32" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'isActive',
        id: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) => {
          const statusProps = getStaffActiveStatusProps(row.original.isActive);
          const variant = statusProps.variant as keyof BadgeProps['variant'];

          return (
            <Badge variant={variant} appearance="ghost">
              <BadgeDot />
              {statusProps.label}
            </Badge>
          );
        },
        size: 125,
        meta: {
          headerTitle: 'Status',
          skeleton: <Skeleton className="h-7 w-14" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'actions',
        header: '',
        cell: () => (
          <ChevronRight className="size-3.5 text-muted-foreground/70" />
        ),
        meta: {
          skeleton: <Skeleton className="size-4" />,
        },
        size: 40,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
      },
    ],
    [],
  );

  const [columnOrder, setColumnOrder] = useState<string[]>([
    'teacher',
    'teacher_id',
    'subsystem',
    'subjects',
    'status',
    'actions',
  ]);

  const table = useReactTable({
    columns,
    data: staff,
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

  const handleRowClick = (row: StaffListRow) => {
    router.push(`/staff/${row.id}`);
  };

  return (
    <DataGrid
      table={table}
      recordCount={staff.length}
      isLoading={isLoading}
      onRowClick={handleRowClick}
      tableLayout={{
        columnsResizable: true,
        columnsPinnable: true,
        columnsMovable: true,
        columnsVisibility: true,
      }}
      tableClassNames={{
        edgeCell: 'px-5',
      }}
    >
      <Card>
        <CardTable>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
