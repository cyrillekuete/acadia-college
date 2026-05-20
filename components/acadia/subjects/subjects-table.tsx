'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { InputWrapper } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { Search } from '@/lib/icons';
import {
  branchLabel,
  subSystemLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import {
  formatSubBranchNames,
  subjectTypeLabel,
} from '@/lib/acadia/subject-catalog';
import {
  canEditSubject,
  rowMatchesSubjectListFilters,
  type SubjectListFilters,
} from '@/lib/acadia/subject';
import {
  formatSubjectLevelsLabel,
  levelLabel,
  specialtyLabel,
  termLabel,
  subjectTermScopeLabel,
} from '@/lib/acadia/record-display';
import { useSubjectList, type SubjectListRowView } from '@/hooks/use-subject-list';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';

export function SubjectsTable({
  catalogFilters,
  listFilters,
  emptyMessage,
}: {
  catalogFilters: CatalogFilters;
  listFilters: SubjectListFilters;
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const { data = [], isLoading, isError, error } = useSubjectList(catalogFilters);
  const { deactivateSubject, reactivateSubject } = useSubjectMutations();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((row) => rowMatchesSubjectListFilters(row, listFilters))
      .filter((row) => {
        if (!q) {
          return true;
        }
        return (
          row.nameEn.toLowerCase().includes(q) ||
          row.nameFr.toLowerCase().includes(q) ||
          row.code.toLowerCase().includes(q)
        );
      });
  }, [data, listFilters, search]);

  const columns = useMemo<ColumnDef<SubjectListRowView>[]>(() => {
    const base: ColumnDef<SubjectListRowView>[] = [
      {
        accessorKey: 'nameEn',
        header: 'Name',
        cell: ({ row }) => (
          <Link
            href={`/subjects/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.nameEn}
          </Link>
        ),
      },
      { accessorKey: 'code', header: 'Code' },
      {
        id: 'subSystem',
        header: 'Subsystem',
        cell: ({ row }) =>
          row.original.subSystem ? subSystemLabel(row.original.subSystem) : '—',
      },
      {
        id: 'branch',
        header: 'Branch',
        cell: ({ row }) => (row.original.branch ? branchLabel(row.original.branch) : '—'),
      },
      {
        id: 'specialty',
        header: 'Specialty',
        cell: ({ row }) => specialtyLabel(row.original.Specialty),
      },
      {
        id: 'level',
        header: 'Level',
        cell: ({ row }) => {
          const levels = (row.original.SubjectLevel ?? [])
            .map((sl) => sl.Level)
            .filter((l): l is NonNullable<typeof l> => l != null);
          if (levels.length === 0) {
            return levelLabel(row.original.Level);
          }
          return formatSubjectLevelsLabel(row.original.Level, levels);
        },
      },
      {
        id: 'term',
        header: 'Term',
        cell: ({ row }) =>
          subjectTermScopeLabel(row.original.Term, row.original.termId),
      },
      {
        id: 'grouping',
        header: 'Grouping',
        cell: ({ row }) => {
          const grouping = row.original.SubjectGrouping;
          const name = grouping?.nameEn?.trim();
          if (!name || !grouping?.id) {
            return '—';
          }
          return (
            <Link
              href={`/subjects/groupings?highlight=${grouping.id}`}
              className="text-primary hover:underline"
            >
              {name}
            </Link>
          );
        },
      },
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => subjectTypeLabel(row.original.subjectType),
      },
      {
        accessorKey: 'coefficient',
        header: 'Coefficient',
        cell: ({ row }) => row.original.coefficient,
      },
      {
        id: 'subBranches',
        header: 'Sub-Branches',
        cell: ({ row }) => {
          const branches = row.original.SubjectSubBranch ?? [];
          const label = formatSubBranchNames(branches, 2);
          if (label === '—') {
            return label;
          }
          const full = branches.map((b) => b.name).join(', ');
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default truncate">{label}</span>
              </TooltipTrigger>
              <TooltipContent>{full}</TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={canEditSubject(row.original.deactivatedAt) ? 'success' : 'secondary'}>
            {canEditSubject(row.original.deactivatedAt) ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
    ];

    if (canManage) {
      base.push({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const isActive = canEditSubject(row.original.deactivatedAt);
          if (!isActive) {
            return (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    window.confirm(
                      `Reactivate subject "${row.original.nameEn}"?`,
                    )
                  ) {
                    reactivateSubject.mutate(row.original.id);
                  }
                }}
              >
                Reactivate
              </Button>
            );
          }
          return (
            <RegistryRowActions
              onEdit={() => router.push(`/subjects/${row.original.id}/edit`)}
              onDelete={() => {
                if (
                  window.confirm(`Deactivate subject "${row.original.nameEn}"?`)
                ) {
                  deactivateSubject.mutate(row.original.id);
                }
              }}
            />
          );
        },
      });
    }

    return base;
  }, [router, deactivateSubject, reactivateSubject, canManage]);

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
        <h3 className="text-sm font-medium">Subjects</h3>
        <InputWrapper className="w-full max-w-xs">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputWrapper>
      </CardHeader>
      <DataGrid table={table} recordCount={filtered.length} isLoading={isLoading}>
        <CardTable>
          <ScrollArea>
            {isError ? (
              <p className="p-5 text-sm text-destructive">
                {error instanceof Error ? error.message : 'Failed to load subjects.'}
              </p>
            ) : isLoading ? (
              <Skeleton className="m-5 h-40 w-full" />
            ) : filtered.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                {emptyMessage ?? 'No subjects match the current filters.'}
              </p>
            ) : (
              <DataGridTable />
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
      </DataGrid>
    </Card>
  );
}
