'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
import { CloudDownload, Download } from 'lucide-react';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import { Badge } from '@/components/ui/badge';
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

interface IInvoicingItem {
  number: string;
  date: string;
  amount: string;
  label: string;
  color: 'warning' | 'success' | 'destructive';
}
type IInvoicingItems = Array<IInvoicingItem>;

const Invoicing = () => {
  const tables: IInvoicingItems = [
    {
      number: 'Invoice-2024-xd912c',
      date: '6 Aug, 2024',
      amount: '24.00',
      label: 'Upcoming',
      color: 'warning',
    },
    {
      number: 'Invoice-2024-rq857m',
      date: '17 Jun, 2024',
      amount: '29.99',
      label: 'Paid',
      color: 'success',
    },
    {
      number: 'Invoice-2024-jk563z',
      date: '30 Apr, 2024',
      amount: '24.00',
      label: 'Paid',
      color: 'success',
    },
    {
      number: 'Invoice-2024-hg234x',
      date: '21 Apr, 2024',
      amount: '6.59',
      label: 'Declined',
      color: 'destructive',
    },
    {
      number: 'Invoice-2024-lp098y',
      date: '14 mar, 2024',
      amount: '24.00',
      label: 'Paid',
      color: 'success',
    },
  ];

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<IInvoicingItem>[]>(
    () => [
      {
        accessorKey: 'number',
        header: ({ column }) => (
          <DataGridColumnHeader title="Invoice" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-foreground font-normal">
            {row.original.number}
          </span>
        ),
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: 'label',
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) => (
          <div className="lg:text-end">
            <Badge variant={row.original.color} appearance="light">
              {row.original.label}
            </Badge>
          </div>
        ),
        size: 120,
        enableSorting: true,
        meta: { cellClassName: 'lg:text-end' },
      },
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-foreground font-normal lg:text-end">
            {row.original.date}
          </span>
        ),
        size: 140,
        enableSorting: true,
        meta: { cellClassName: 'lg:text-end' },
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <DataGridColumnHeader title="Amount" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-secondary-foreground font-normal lg:text-end">
            ${row.original.amount}
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
          <Button variant="ghost" mode="icon">
            <Download className="text-blue-500" />
          </Button>
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
        <CardHeader>
          <CardTitle>Billing and Invoicing</CardTitle>
          <Button variant="outline">
            <CloudDownload size={16} />
            Download All
          </Button>
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
            <Link href="/account/billing/history">View all Payments</Link>
          </Button>
        </CardFooter>
      </Card>
    </DataGrid>
  );
};

export { Invoicing, type IInvoicingItem, type IInvoicingItems };
