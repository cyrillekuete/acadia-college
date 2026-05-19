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
import { ChevronRight, Search, X } from '@/lib/icons';
import { formatDate, getInitials } from '@/lib/helpers';
import {
  filterDummyStudents,
  getDummyStudentClasses,
  getDummyStudentFullName,
  type DummyStudent,
} from '@/lib/acadia/dummy-students';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge, BadgeDot, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getStudentEnrollmentStatusProps,
  StudentEnrollmentStatusProps,
} from '@/components/acadia/student/student-list-status';

export function StudentList() {
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'enrollment_date', desc: true },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | null>('all');

  const classList = useMemo(() => getDummyStudentClasses(), []);

  const filteredData = useMemo(
    () =>
      filterDummyStudents({
        query: searchQuery,
        className: selectedClass,
        enrollmentStatus: selectedStatus,
      }),
    [searchQuery, selectedClass, selectedStatus],
  );

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
        accessorKey: 'enrollment_date',
        id: 'enrollment_date',
        header: ({ column }) => (
          <DataGridColumnHeader title="Enrolled" visibility column={column} />
        ),
        cell: (info) => formatDate(new Date(info.getValue() as string)),
        size: 150,
        meta: {
          headerTitle: 'Enrolled',
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

  const [columnOrder, setColumnOrder] = useState<string[]>(
    columns.map((column) => column.id as string),
  );

  const table = useReactTable({
    columns,
    data: filteredData,
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

  const DataGridToolbar = () => {
    const [inputValue, setInputValue] = useState(searchQuery);

    const handleSearch = () => {
      setSearchQuery(inputValue);
      setPagination({ ...pagination, pageIndex: 0 });
    };

    const clearSearch = () => {
      setInputValue('');
      setSearchQuery('');
      setPagination({ ...pagination, pageIndex: 0 });
    };

    return (
      <CardHeader className="flex-col flex-wrap items-stretch py-5 sm:flex-row sm:items-center">
        <div className="flex flex-col items-stretch justify-between gap-2.5 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full ps-9 sm:w-40 md:w-64"
            />
            {searchQuery.length > 0 ? (
              <Button
                mode="icon"
                variant="dim"
                className="absolute end-1.5 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={clearSearch}
              >
                <X />
              </Button>
            ) : null}
          </div>
          <Select
            onValueChange={(value) => {
              setSelectedClass(value);
              setPagination({ ...pagination, pageIndex: 0 });
            }}
            value={selectedClass || 'all'}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classList.map((className) => (
                <SelectItem key={className} value={className}>
                  {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => {
              setSelectedStatus(value);
              setPagination({ ...pagination, pageIndex: 0 });
            }}
            value={selectedStatus || 'all'}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All students</SelectItem>
              {Object.entries(StudentEnrollmentStatusProps).map(
                ([status, { label }]) => (
                  <SelectItem key={status} value={status}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
    );
  };

  return (
    <DataGrid
      table={table}
      recordCount={filteredData.length}
      isLoading={false}
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
        <DataGridToolbar />
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
