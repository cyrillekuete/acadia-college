'use client';

import { ReactElement, useMemo, useState } from 'react';
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
import {
  FileDown,
  Filter,
  NotepadText,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { formatDateTime, unwrapRelation } from '@/lib/acadia/record-display';
import { useSupabaseTableList } from '@/hooks/use-supabase-table-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, useDataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

const SELECT = `
  id,
  event,
  description,
  createdAt,
  userId,
  entityType,
  entityId,
  User:userId ( email, name )
`;

type SystemLogRow = {
  id: string;
  event?: string;
  description?: string;
  createdAt?: string;
  userId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  User?: unknown;
} & Record<string, unknown>;

type EventType = {
  icon: ReactElement;
  label: string;
};

type Severity = {
  label: string;
  variant:
    | 'secondary'
    | 'primary'
    | 'destructive'
    | 'success'
    | 'info'
    | 'warning'
    | null
    | undefined;
};

type LogDisplayRow = SystemLogRow & {
  eventType: EventType;
  severity: Severity;
  actionTaken: string;
  actorLabel: string;
};

function inferSeverity(event?: string): Severity {
  const e = String(event ?? '').toLowerCase();
  if (e.includes('block') || e.includes('fail') || e.includes('error')) {
    return { label: 'High', variant: 'warning' };
  }
  if (e.includes('delete') || e.includes('revoke')) {
    return { label: 'Critical', variant: 'destructive' };
  }
  if (e.includes('update') || e.includes('change')) {
    return { label: 'Medium', variant: 'primary' };
  }
  return { label: 'Low', variant: 'success' };
}

function inferEventIcon(event?: string): ReactElement {
  const e = String(event ?? '').toLowerCase();
  if (e.includes('block') || e.includes('fail')) {
    return <ShieldAlert size={16} className="text-destructive" />;
  }
  return <ShieldCheck size={16} className="text-primary" />;
}

function mapLogRow(row: SystemLogRow): LogDisplayRow {
  const user = unwrapRelation<{ email?: string; name?: string }>(row.User);
  const actorLabel = user?.email || user?.name || '—';
  const eventLabel = String(row.event ?? 'System event');

  return {
    ...row,
    eventType: {
      icon: inferEventIcon(row.event),
      label: eventLabel,
    },
    severity: inferSeverity(row.event),
    actionTaken: String(row.description ?? '—'),
    actorLabel,
  };
}

export function SystemLogDataGrid({
  userEmailFilter,
  entityIdFilter,
  entityTypes,
}: {
  userEmailFilter?: string;
  entityIdFilter?: string;
  entityTypes?: string[];
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);

  const { data: logs = [], isLoading, isError, error } =
    useSupabaseTableList<SystemLogRow>('SystemLog', SELECT);

  const displayRows = useMemo(() => {
    let rows = logs.map(mapLogRow);
    const emailQ = userEmailFilter?.trim().toLowerCase();
    if (emailQ) {
      rows = rows.filter((row) =>
        row.actorLabel.toLowerCase().includes(emailQ),
      );
    }
    const entityId = entityIdFilter?.trim();
    if (entityId) {
      rows = rows.filter((row) => String(row.entityId ?? '') === entityId);
    }
    if (entityTypes?.length) {
      const allowed = new Set(entityTypes);
      rows = rows.filter((row) =>
        allowed.has(String(row.entityType ?? '')),
      );
    }
    return rows;
  }, [logs, userEmailFilter, entityIdFilter, entityTypes]);

  const filteredData = useMemo(() => {
    return displayRows.filter((item) => {
      const matchesSeverity =
        !selectedSeverities.length ||
        selectedSeverities.includes(item.severity.label);

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        String(item.createdAt ?? '').toLowerCase().includes(searchLower) ||
        item.eventType.label.toLowerCase().includes(searchLower) ||
        item.actionTaken.toLowerCase().includes(searchLower) ||
        item.actorLabel.toLowerCase().includes(searchLower) ||
        String(item.entityType ?? '').toLowerCase().includes(searchLower);

      return matchesSeverity && matchesSearch;
    });
  }, [displayRows, searchQuery, selectedSeverities]);

  const severityCounts = useMemo(() => {
    return displayRows.reduce(
      (acc, item) => {
        const severity = item.severity.label;
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [displayRows]);

  const handleSeverityChange = (checked: boolean, value: string) => {
    setSelectedSeverities((prev = []) =>
      checked ? [...prev, value] : prev.filter((v) => v !== value),
    );
  };

  const columns = useMemo<ColumnDef<LogDisplayRow>[]>(
    () => [
      {
        id: 'createdAt',
        accessorFn: (row) => row.createdAt,
        header: ({ column }) => (
          <DataGridColumnHeader title="Timestamp" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-secondary-foreground font-normal">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
        enableSorting: true,
        size: 200,
      },
      {
        id: 'eventType',
        accessorFn: (row) => row.eventType.label,
        header: ({ column }) => (
          <DataGridColumnHeader title="Event Type" column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            {row.original.eventType.icon}
            <span className="leading-none font-semibold text-secondary-foreground">
              {row.original.eventType.label}
            </span>
          </div>
        ),
        enableSorting: true,
        size: 200,
      },
      {
        id: 'actionTaken',
        accessorFn: (row) => row.actionTaken,
        header: ({ column }) => (
          <DataGridColumnHeader title="Action Taken" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-secondary-foreground font-normal">
            {row.original.actionTaken}
          </span>
        ),
        enableSorting: true,
        size: 240,
      },
      {
        id: 'actor',
        accessorFn: (row) => row.actorLabel,
        header: ({ column }) => (
          <DataGridColumnHeader title="Actor" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-secondary-foreground font-normal">
            {row.original.actorLabel}
          </span>
        ),
        enableSorting: true,
        size: 180,
      },
      {
        id: 'entityType',
        accessorFn: (row) => row.entityType,
        header: ({ column }) => (
          <DataGridColumnHeader title="Entity" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-secondary-foreground font-normal">
            {row.original.entityType || '—'}
          </span>
        ),
        enableSorting: true,
        size: 130,
      },
      {
        id: 'severity',
        accessorFn: (row) => row.severity.label,
        header: ({ column }) => (
          <DataGridColumnHeader title="Severity" column={column} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.severity.variant} appearance="light">
            {row.original.severity.label}
          </Badge>
        ),
        enableSorting: true,
        size: 110,
      },
      {
        id: 'actions',
        header: () => '',
        cell: () => (
          <Button variant="ghost">
            <NotepadText />
          </Button>
        ),
        enableSorting: false,
        size: 70,
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData.length || 0) / pagination.pageSize) || 1,
    getRowId: (row) => row.id,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const GridToolbar = () => {
    const { table: gridTable } = useDataGrid();

    return (
      <CardToolbar>
        <div className="flex flex-wrap items-center gap-2.5">
          <Label htmlFor="push-alerts" className="text-sm">
            Push Alerts
          </Label>
          <Switch size="sm" id="push-alerts" defaultChecked />
          <Button variant="outline" disabled>
            <FileDown />
            Export
          </Button>
        </div>
        <DataGridColumnVisibility
          table={gridTable}
          trigger={
            <Button variant="outline">
              <Settings2 />
              Columns
            </Button>
          }
        />
      </CardToolbar>
    );
  };

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : 'Failed to load logs.'}
      </p>
    );
  }

  return (
    <DataGrid
      table={table}
      recordCount={filteredData.length}
      isLoading={isLoading}
      tableLayout={{
        columnsPinnable: true,
        columnsMovable: true,
        columnsVisibility: true,
        cellBorder: true,
      }}
    >
      <Card>
        <CardHeader>
          <CardHeading>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search Logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9 w-40 md:w-64"
                />
                {searchQuery.length > 0 && (
                  <Button
                    mode="icon"
                    variant="ghost"
                    className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchQuery('')}
                  >
                    <X />
                  </Button>
                )}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Filter />
                    Severity
                    {selectedSeverities.length > 0 && (
                      <Badge variant="outline">{selectedSeverities.length}</Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-3" align="start">
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground">
                      Filters
                    </div>
                    <div className="space-y-3">
                      {Object.keys(severityCounts).map((severity) => (
                        <div key={severity} className="flex items-center gap-2.5">
                          <Checkbox
                            id={severity}
                            checked={selectedSeverities.includes(severity)}
                            onCheckedChange={(checked) =>
                              handleSeverityChange(checked === true, severity)
                            }
                          />
                          <Label
                            htmlFor={severity}
                            className="grow flex items-center justify-between font-normal gap-1.5"
                          >
                            {severity}
                            <span className="text-muted-foreground">
                              {severityCounts[severity]}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeading>
          <GridToolbar />
        </CardHeader>
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
