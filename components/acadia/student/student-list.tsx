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
import { getDummyStudentFullName, type DummyStudent } from '@/lib/acadia/dummy-students';
import {
  formatStudentFeesAmounts,
  studentBranchLabel,
  studentFeesStatusLabel,
  studentFeesStatusVariant,
} from '@/lib/acadia/student-list';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge, BadgeDot, BadgeProps } from '@/components/ui/badge';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { getStudentEnrollmentStatusProps } from '@/components/acadia/student/student-list-status';

export function StudentList({
  students,
  isLoading = false,
}: {
  students: DummyStudent[];
  isLoading?: boolean;
}) {
  const router = useRouter();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<DummyStudent>[]>(
    () => [
      {
        id: 'student',
        accessorFn: (row) => getDummyStudentFullName(row),
        header: ({ column }) => (
          <DataGridColumnHeader title="Student" visibility column={column} />
        ),
        cell: ({ row }) => {
          const student = row.original;
          const fullName = getDummyStudentFullName(student);
          const initials = getInitials(fullName || student.email);

          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                {student.avatar ? (
                  <AvatarImage src={student.avatar} alt={fullName} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-px">
                <div className="text-sm font-medium">{fullName}</div>
                <div className="text-xs text-muted-foreground">
                  {student.email}
                </div>
              </div>
            </div>
          );
        },
        size: 300,
        meta: {
          headerTitle: 'Student',
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
        accessorKey: 'class_name',
        id: 'class_name',
        header: ({ column }) => (
          <DataGridColumnHeader title="Class" visibility column={column} />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.class_name}</Badge>
        ),
        size: 150,
        meta: {
          headerTitle: 'Class',
          skeleton: <Skeleton className="h-7 w-28" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'branch',
        id: 'branch',
        header: ({ column }) => (
          <DataGridColumnHeader title="Branch" visibility column={column} />
        ),
        cell: ({ row }) => {
          const label = studentBranchLabel(row.original.branch);
          if (label === '—') {
            return <span className="text-muted-foreground">—</span>;
          }
          return <Badge variant="outline">{label}</Badge>;
        },
        size: 130,
        meta: {
          headerTitle: 'Branch',
          skeleton: <Skeleton className="h-7 w-24" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'enrollment_status',
        id: 'enrollment_status',
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) => {
          const statusProps = getStudentEnrollmentStatusProps(
            row.original.enrollment_status,
          );
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
        accessorKey: 'registration_number',
        id: 'registration_number',
        header: ({ column }) => (
          <DataGridColumnHeader title="Student ID" visibility column={column} />
        ),
        cell: (info) => (info.getValue() as string | null) ?? '—',
        size: 175,
        meta: {
          headerTitle: 'Student ID',
          skeleton: <Skeleton className="h-7 w-20" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        accessorKey: 'matricule_number',
        id: 'matricule_number',
        header: ({ column }) => (
          <DataGridColumnHeader title="Matricule" visibility column={column} />
        ),
        cell: (info) => (info.getValue() as string | null) ?? '—',
        size: 175,
        meta: {
          headerTitle: 'Matricule',
          skeleton: <Skeleton className="h-7 w-20" />,
        },
        enableSorting: true,
        enableHiding: true,
      },
      {
        id: 'fees',
        accessorFn: (row) => row.total_fees,
        header: ({ column }) => (
          <DataGridColumnHeader title="Fees" visibility column={column} />
        ),
        cell: ({ row }) => {
          const { paid_fees, total_fees, fees_status } = row.original;
          const amounts = formatStudentFeesAmounts(paid_fees, total_fees);
          const variant = studentFeesStatusVariant(
            fees_status,
            paid_fees,
            total_fees,
          );

          return (
            <div className="space-y-1">
              <Badge variant={variant} appearance="light" size="sm">
                {studentFeesStatusLabel(fees_status)}
              </Badge>
              {amounts ? (
                <div className="text-xs text-muted-foreground">{amounts}</div>
              ) : null}
            </div>
          );
        },
        size: 160,
        meta: {
          headerTitle: 'Fees',
          skeleton: (
            <div className="space-y-1">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ),
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
    'student',
    'class_name',
    'branch',
    'enrollment_status',
    'registration_number',
    'matricule_number',
    'fees',
    'actions',
  ]);

  const table = useReactTable({
    columns,
    data: students,
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

  const handleRowClick = (row: DummyStudent) => {
    router.push(`/students/${row.id}`);
  };

  return (
    <DataGrid
      table={table}
      recordCount={students.length}
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
