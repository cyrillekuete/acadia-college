'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DropdownMenu2 } from '@/partials/dropdown-menu/dropdown-menu-2';
import { DropdownMenu5 } from '@/partials/dropdown-menu/dropdown-menu-5';
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
import { EllipsisVertical } from 'lucide-react';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardTable,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface IPaymentHistoryItem {
  date: string;
  type: string;
  amount: string;
}
type IPaymentHistoryItems = Array<IPaymentHistoryItem>;

const PaymentHistory = () => {
  const tables: IPaymentHistoryItems = [
    {
      date: '24 Aug, 2024',
      type: 'Subscription Fee',
      amount: '$24.00',
    },
    {
      date: '15 Sep, 2024',
      type: 'Product Purchase',
      amount: '$50.99',
    },
    {
      date: '05 Dec, 2024',
      type: 'Transaction Fee',
      amount: '$2.50',
    },
    {
      date: '30 May, 2025',
      type: 'Annual Maintenance',
      amount: '$40.20',
    },
  ];

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<IPaymentHistoryItem>[]>(
    () => [
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-normal text-foreground">
            {row.original.date}
          </span>
        ),
        size: 160,
        enableSorting: true,
      },
      {
        accessorKey: 'type',
        header: ({ column }) => (
          <DataGridColumnHeader title="Type" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-normal text-foreground lg:text-end">
            {row.original.type}
          </span>
        ),
        size: 180,
        enableSorting: true,
        meta: { cellClassName: 'lg:text-end' },
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <DataGridColumnHeader title="Amount" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-normal text-foreground lg:text-end">
            {row.original.amount}
          </span>
        ),
        size: 120,
        enableSorting: true,
        meta: { cellClassName: 'lg:text-end' },
      },
      {
        id: 'actions',
        header: '',
        cell: () => (
          <DropdownMenu5
            trigger={
              <Button variant="ghost" mode="icon">
                <EllipsisVertical />
              </Button>
            }
          />
        ),
        size: 64,
        enableSorting: false,
        enableResizing: false,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: tables,
    columns,
    state: { sorting, pagination },
    columnResizeMode: 'onChange',
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
      recordCount={tables.length}
      tableLayout={METRONIC_RESIZABLE_TABLE_LAYOUT}
      tableClassNames={{
        edgeCell: 'px-5',
      }}
    >
      <Card>
        <CardHeader className="gap-2">
          <CardTitle>Payment History</CardTitle>
          <DropdownMenu2
            trigger={
              <Button variant="ghost" mode="icon">
                <EllipsisVertical />
              </Button>
            }
          />
        </CardHeader>
        <CardTable>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <DataGridPagination />
          <Button mode="link" underlined="dashed" asChild>
            <Link href="#">View all Payments</Link>
          </Button>
        </CardFooter>
      </Card>
    </DataGrid>
  );
};

export { PaymentHistory, type IPaymentHistoryItem, type IPaymentHistoryItems };
