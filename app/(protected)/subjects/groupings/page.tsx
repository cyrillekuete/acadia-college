'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Plus } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import {
  SubjectGroupingFormDialog,
  type SubjectGroupingRow,
} from '@/components/acadia/subjects/subject-grouping-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  useSubjectGroupingList,
  type SubjectGroupingListRow,
} from '@/hooks/use-subject-grouping-list';
import { useSubjectGroupingMutations } from '@/hooks/use-subject-grouping-mutations';
import { isAdmin } from '@/lib/acadia/roles';
import { cn } from '@/lib/utils';

export default function SubjectGroupingsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectGroupingRow | null>(null);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = isAdmin(session?.roleSlug);
  const { deleteGrouping } = useSubjectGroupingMutations();
  const { data = [], isLoading, isError, error } = useSubjectGroupingList();

  useEffect(() => {
    if (!highlightId) {
      return;
    }
    const row = document.querySelector(`[data-grouping-id="${highlightId}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightId, data]);

  const columns = useMemo<ColumnDef<SubjectGroupingListRow>[]>(() => {
    const base: ColumnDef<SubjectGroupingListRow>[] = [
      { accessorKey: 'nameEn', header: 'Name (EN)' },
      { accessorKey: 'nameFr', header: 'Name (FR)' },
      { accessorKey: 'code', header: 'Code' },
      { accessorKey: 'sortOrder', header: 'Sort order' },
      {
        accessorKey: 'subjectCount',
        header: 'Subjects',
        cell: ({ row }) => row.original.subjectCount,
      },
    ];

    if (canManage) {
      base.push({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <RegistryRowActions
            onEdit={() => {
              setEditing({
                id: row.original.id,
                nameEn: row.original.nameEn,
                nameFr: row.original.nameFr,
                code: row.original.code,
                sortOrder: row.original.sortOrder,
              });
              setDialogOpen(true);
            }}
            onDelete={() => {
              const count = row.original.subjectCount;
              const unlinkNote =
                count > 0
                  ? ` ${count} subject${count === 1 ? '' : 's'} will be unlinked.`
                  : '';
              if (
                window.confirm(
                  `Delete grouping "${row.original.nameEn}"?${unlinkNote}`,
                )
              ) {
                deleteGrouping.mutate(row.original.id);
              }
            }}
          />
        ),
      });
    }

    return base;
  }, [canManage, deleteGrouping]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <AcadiaPageShell
      title="Acadia College — Subject groupings"
      description="Define optional groupings that subjects can belong to (e.g. science block, languages)."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/subjects">Back to subjects</Link>
        </Button>
        {canManage ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            New grouping
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="py-4">
          <h3 className="text-sm font-medium">Groupings</h3>
        </CardHeader>
        <DataGrid table={table} recordCount={data.length} isLoading={isLoading}>
          <CardTable>
            <ScrollArea>
              {isError ? (
                <p className="p-5 text-sm text-destructive">
                  {error instanceof Error ? error.message : 'Failed to load groupings.'}
                </p>
              ) : isLoading ? (
                <Skeleton className="m-5 h-40 w-full" />
              ) : data.length === 0 ? (
                <div className="space-y-3 p-5 text-sm text-muted-foreground">
                  <p>No groupings defined yet.</p>
                  {canManage ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="size-4" />
                      Create first grouping
                    </Button>
                  ) : null}
                </div>
              ) : (
                <table className="w-full caption-bottom text-foreground text-sm">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b border-border">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="h-10 px-4 text-left align-middle font-normal text-muted-foreground"
                          >
                            {header.isPlaceholder
                              ? null
                              : typeof header.column.columnDef.header === 'string'
                                ? header.column.columnDef.header
                                : null}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        data-grouping-id={row.original.id}
                        className={cn(
                          'border-b border-border transition-colors hover:bg-muted/50',
                          highlightId === row.original.id && 'bg-muted/70',
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 align-middle">
                            {typeof cell.column.columnDef.cell === 'function'
                              ? cell.column.columnDef.cell(cell.getContext())
                              : null}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
        </DataGrid>
      </Card>

      <SubjectGroupingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
      />
    </AcadiaPageShell>
  );
}
