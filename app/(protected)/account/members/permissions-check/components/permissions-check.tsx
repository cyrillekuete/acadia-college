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
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardTable,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface IPermissionsCheckItem {
  module: string;
  view: boolean;
  modify: boolean;
  publish: boolean;
  configure: boolean;
}
type IPermissionsCheckItems = Array<IPermissionsCheckItem>;

const PermissionsCheck = () => {
  const data: IPermissionsCheckItems = [
    {
      module: 'Workspace Settings',
      view: true,
      modify: true,
      publish: true,
      configure: true,
    },
    {
      module: 'Billing Management',
      view: true,
      modify: false,
      publish: false,
      configure: false,
    },
    {
      module: 'Integration Setup',
      view: true,
      modify: true,
      publish: false,
      configure: false,
    },
    {
      module: 'Map Creation',
      view: true,
      modify: true,
      publish: true,
      configure: true,
    },
    {
      module: 'Data Export',
      view: true,
      modify: false,
      publish: false,
      configure: false,
    },
    {
      module: 'User Roles',
      view: true,
      modify: false,
      publish: false,
      configure: false,
    },
    {
      module: 'Security Settings',
      view: true,
      modify: false,
      publish: false,
      configure: false,
    },
    {
      module: 'Insights Access',
      view: false,
      modify: false,
      publish: false,
      configure: false,
    },
    {
      module: 'Merchant List',
      view: true,
      modify: true,
      publish: false,
      configure: false,
    },
  ];

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<IPermissionsCheckItem>[]>(
    () => [
      {
        accessorKey: 'module',
        header: ({ column }) => (
          <DataGridColumnHeader title="Module" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-mono font-medium">{row.original.module}</span>
        ),
        size: 300,
        enableSorting: true,
      },
      {
        accessorKey: 'view',
        header: ({ column }) => (
          <DataGridColumnHeader title="View" visibility column={column} />
        ),
        cell: ({ row }) => (
          <div className="text-center">
            <Checkbox defaultChecked={row.original.view} />
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: { cellClassName: 'text-center' },
      },
      {
        accessorKey: 'modify',
        header: ({ column }) => (
          <DataGridColumnHeader title="Modify" visibility column={column} />
        ),
        cell: ({ row }) => (
          <div className="text-center">
            <Checkbox defaultChecked={row.original.modify} />
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: { cellClassName: 'text-center' },
      },
      {
        accessorKey: 'publish',
        header: ({ column }) => (
          <DataGridColumnHeader title="Publish" visibility column={column} />
        ),
        cell: ({ row }) => (
          <div className="text-center">
            <Checkbox defaultChecked={row.original.publish} />
          </div>
        ),
        size: 100,
        enableSorting: false,
        meta: { cellClassName: 'text-center' },
      },
      {
        accessorKey: 'configure',
        header: ({ column }) => (
          <DataGridColumnHeader title="Configure" visibility column={column} />
        ),
        cell: ({ row }) => (
          <div className="text-center">
            <Checkbox defaultChecked={row.original.configure} />
          </div>
        ),
        size: 120,
        enableSorting: false,
        meta: { cellClassName: 'text-center' },
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
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
      recordCount={data.length}
      tableLayout={METRONIC_RESIZABLE_TABLE_LAYOUT}
      tableClassNames={{
        edgeCell: 'px-5',
      }}
    >
      <Card>
        <CardHeader className="gap-2">
          <CardTitle>
            <Button mode="link" asChild className="text-xl">
              <Link href="#">Project Manager</Link>
            </Button>{' '}
            Role Permissions
          </CardTitle>
          <div className="flex gap-5">
            <Button variant="outline">
              <Link href="#">New Permission</Link>
            </Button>
          </div>
        </CardHeader>
        <CardTable>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2.5 py-7.5">
          <DataGridPagination />
          <div className="flex gap-2.5">
            <Button variant="outline">
              <Link href="#">Restore Defaults</Link>
            </Button>
            <Button>
              <Link href="#">Save Changes</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </DataGrid>
  );
};

export {
  PermissionsCheck,
  type IPermissionsCheckItem,
  type IPermissionsCheckItems,
};
