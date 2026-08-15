'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DropdownMenu3 } from '@/partials/dropdown-menu/dropdown-menu-3';
import { DropdownMenu4 } from '@/partials/dropdown-menu/dropdown-menu-4';
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
import { toAbsoluteUrl } from '@/lib/helpers';
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
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

interface IMembersItem {
  avatar: string;
  name: string;
  connections: number;
  label: string;
  joined: string;
  disabled: boolean;
}
type IMembersItems = Array<IMembersItem>;

interface IMembersProps {
  url: string;
}

const Members = ({ url }: IMembersProps) => {
  const tables: IMembersItems = [
    {
      avatar: '300-3.png',
      name: 'Tyler Hero',
      connections: 26,
      label: 'Project Member',
      joined: 'Today',
      disabled: true,
    },
    {
      avatar: '300-1.png',
      name: 'Esther Howard',
      connections: 639,
      label: 'Accountant',
      joined: '5 days ago',
      disabled: false,
    },
    {
      avatar: '300-11.png',
      name: 'Jacob Jones',
      connections: 125,
      label: 'Data Analyst',
      joined: '3 days ago',
      disabled: false,
    },
    {
      avatar: '300-2.png',
      name: 'Cody Fisher',
      connections: 81,
      label: 'Accountant',
      joined: '2 weeks ago',
      disabled: true,
    },
    {
      avatar: '300-5.png',
      name: 'Leslie Alexander',
      connections: 1203,
      label: 'Director',
      joined: '3 weeks ago',
      disabled: false,
    },
  ];

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<IMembersItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataGridColumnHeader title="Name" visibility column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center grow gap-2.5">
            <img
              src={toAbsoluteUrl(`/media/avatars/${row.original.avatar}`)}
              className="rounded-full size-9 shrink-0"
              alt="image"
            />
            <div className="flex flex-col">
              <Link
                href="#"
                className="text-sm font-semibold text-mono hover:text-primary-active mb-px"
              >
                {row.original.name}
              </Link>
              <span className="text-xs font-normal text-secondary-foreground">
                {row.original.connections} connections
              </span>
            </div>
          </div>
        ),
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: 'label',
        header: ({ column }) => (
          <DataGridColumnHeader title="Role" visibility column={column} />
        ),
        cell: ({ row }) => (
          <div className="text-end">
            <Badge variant="secondary" appearance="light">
              {row.original.label}
            </Badge>
          </div>
        ),
        size: 160,
        enableSorting: true,
        meta: { cellClassName: 'text-end' },
      },
      {
        accessorKey: 'disabled',
        header: ({ column }) => (
          <DataGridColumnHeader title="2FA" visibility column={column} />
        ),
        cell: ({ row }) => (
          <div className="text-end">
            <Badge
              appearance="light"
              variant={row.original.disabled ? 'destructive' : 'success'}
            >
              {row.original.disabled ? 'Disabled' : 'Enabled'}
            </Badge>
          </div>
        ),
        size: 120,
        enableSorting: true,
        meta: { cellClassName: 'text-end' },
      },
      {
        accessorKey: 'joined',
        header: ({ column }) => (
          <DataGridColumnHeader title="Joined" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-end text-secondary-foreground text-sm">
            {row.original.joined}
          </span>
        ),
        size: 120,
        enableSorting: true,
        meta: { cellClassName: 'text-end' },
      },
      {
        id: 'actions',
        header: '',
        cell: () => (
          <div className="text-end">
            <DropdownMenu4
              trigger={
                <Button variant="ghost" mode="icon">
                  <EllipsisVertical />
                </Button>
              }
            />
          </div>
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
      <Card className="min-w-full">
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-update" className="text-sm">
                Enforce 2FA
              </Label>
              <Switch defaultChecked size="sm" />
            </div>
            <DropdownMenu3
              trigger={
                <Button variant="ghost" mode="icon">
                  <EllipsisVertical />
                </Button>
              }
            />
          </div>
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
            <Link href={url}>View 64 more</Link>
          </Button>
        </CardFooter>
      </Card>
    </DataGrid>
  );
};

export { Members, type IMembersItem, type IMembersItems, type IMembersProps };
