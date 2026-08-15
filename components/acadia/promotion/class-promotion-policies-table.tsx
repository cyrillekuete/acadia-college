'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Link from 'next/link';
import { LoaderCircleIcon } from '@/lib/icons';
import { ACADEMIC_STRUCTURE_TABLE_LAYOUT } from '@/components/acadia/academics/academic-structure-table-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  DEFAULT_MIN_PROMOTION_AVERAGE,
  type ClassPromotionPolicyFormValues,
} from '@/lib/acadia/class-promotion-policy-schemas';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import {
  countEnrollmentsForClass,
  fetchActiveClassesForPromotion,
  fetchClassPromotionPolicies,
} from '@/lib/supabase/queries/promotion';
import { useClassPromotionPolicyMutations } from '@/hooks/use-class-promotion-policy-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';

type PolicyTableRow = {
  id: string;
  name: string;
  enrolled: number;
  configured: boolean;
};

type PolicyDraft = {
  autoPromotionEnabled: boolean;
  minPromotionAverage: string;
  notes: string;
};

type YearOption = { id: string; label: string };

export function ClassPromotionPoliciesTable({
  academicYearId,
  years = [],
}: {
  academicYearId: string;
  years?: YearOption[];
}) {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { saveClassPromotionPolicy, copyPoliciesFromPriorYear } =
    useClassPromotionPolicyMutations();
  const [drafts, setDrafts] = useState<Record<string, PolicyDraft>>({});
  const [copyFromYearId, setCopyFromYearId] = useState('');

  const query = useQuery({
    queryKey: ['class-promotion-policies', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const [classes, policies] = await Promise.all([
        fetchActiveClassesForPromotion(supabase, tenantId!),
        fetchClassPromotionPolicies(supabase, tenantId!, academicYearId),
      ]);

      const enrollmentCounts = await Promise.all(
        classes.map(async (cls) => ({
          classId: cls.id,
          count: await countEnrollmentsForClass(
            supabase,
            tenantId!,
            academicYearId,
            cls.id,
          ),
        })),
      );

      return { classes, policies, enrollmentCounts };
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!academicYearId,
  });

  const policyByClassId = useMemo(() => {
    const map = new Map(
      (query.data?.policies ?? []).map((p) => [p.classId, p]),
    );
    return map;
  }, [query.data?.policies]);

  const enrollmentByClassId = useMemo(() => {
    return new Map(
      (query.data?.enrollmentCounts ?? []).map((e) => [e.classId, e.count]),
    );
  }, [query.data?.enrollmentCounts]);

  const priorYears = years.filter((y) => y.id !== academicYearId);

  const getDraft = (classId: string): PolicyDraft => {
    if (drafts[classId]) {
      return drafts[classId];
    }
    const existing = policyByClassId.get(classId);
    return {
      autoPromotionEnabled: existing?.autoPromotionEnabled ?? true,
      minPromotionAverage: String(
        existing?.minPromotionAverage ?? DEFAULT_MIN_PROMOTION_AVERAGE,
      ),
      notes: existing?.notes ?? '',
    };
  };

  const updateDraft = (classId: string, patch: Partial<PolicyDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [classId]: { ...getDraft(classId), ...patch },
    }));
  };

  const handleSave = (classId: string) => {
    const draft = getDraft(classId);
    const values: ClassPromotionPolicyFormValues = {
      classId,
      academicYearId,
      autoPromotionEnabled: draft.autoPromotionEnabled,
      minPromotionAverage: Number(draft.minPromotionAverage),
      notes: draft.notes || undefined,
    };
    saveClassPromotionPolicy.mutate(values, {
      onSuccess: () => {
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[classId];
          return next;
        });
      },
    });
  };

  const classes = query.data?.classes ?? [];
  const tableRows = useMemo<PolicyTableRow[]>(
    () =>
      classes.map((cls) => ({
        id: cls.id,
        name: cls.name,
        enrolled: enrollmentByClassId.get(cls.id) ?? 0,
        configured: !!policyByClassId.get(cls.id),
      })),
    [classes, enrollmentByClassId, policyByClassId],
  );

  const [columnOrder, setColumnOrder] = useState([
    'name',
    'enrolled',
    'minAverage',
    'autoPromotion',
    'status',
    'actions',
  ]);

  const columns = useMemo<ColumnDef<PolicyTableRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataGridColumnHeader title="Class" visibility column={column} />
        ),
        cell: ({ row }) => (
          <Link
            href={`/academics/promotion?year=${academicYearId}&class=${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.name}
          </Link>
        ),
        size: 180,
      },
      {
        accessorKey: 'enrolled',
        header: ({ column }) => (
          <DataGridColumnHeader title="Enrolled" visibility column={column} />
        ),
        size: 100,
      },
      {
        id: 'minAverage',
        header: ({ column }) => (
          <DataGridColumnHeader title="Min average" visibility column={column} />
        ),
        cell: ({ row }) => {
          const draft = getDraft(row.original.id);
          return (
            <Input
              type="number"
              step="0.01"
              min={0}
              max={20}
              className="w-24"
              title="Students promote when year average ≥ this value (2 decimal places)."
              value={draft.minPromotionAverage}
              onChange={(e) =>
                updateDraft(row.original.id, {
                  minPromotionAverage: e.target.value,
                })
              }
            />
          );
        },
        size: 140,
        enableSorting: false,
      },
      {
        id: 'autoPromotion',
        header: ({ column }) => (
          <DataGridColumnHeader title="Auto-promotion" visibility column={column} />
        ),
        cell: ({ row }) => {
          const draft = getDraft(row.original.id);
          return (
            <Switch
              checked={draft.autoPromotionEnabled}
              onCheckedChange={(checked) =>
                updateDraft(row.original.id, { autoPromotionEnabled: checked })
              }
            />
          );
        },
        size: 140,
        enableSorting: false,
      },
      {
        accessorKey: 'configured',
        id: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) =>
          row.original.configured ? (
            <Badge variant="secondary">Configured</Badge>
          ) : (
            <Badge variant="outline">Not configured</Badge>
          ),
        size: 140,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saveClassPromotionPolicy.isPending}
              onClick={() => handleSave(row.original.id)}
            >
              Save
            </Button>
          </div>
        ),
        size: 90,
        enableResizing: false,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [academicYearId, drafts, policyByClassId, saveClassPromotionPolicy.isPending],
  );

  const table = useReactTable({
    data: tableRows,
    columns,
    getRowId: (row) => row.id,
    state: { columnOrder },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" />
        Loading class policies…
      </div>
    );
  }

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active classes found. Create classes under Classes &amp; Levels first.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Set the minimum year average (compared with ≥, rounded to 2 decimals) and
        whether automatic promotion applies for each class in this academic year.
      </p>

      {priorYears.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Copy from year</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={copyFromYearId}
              onChange={(e) => setCopyFromYearId(e.target.value)}
            >
              <option value="">Select prior year</option>
              {priorYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!copyFromYearId || copyPoliciesFromPriorYear.isPending}
            onClick={() => {
              if (copyFromYearId) {
                copyPoliciesFromPriorYear.mutate({
                  fromYearId: copyFromYearId,
                  toYearId: academicYearId,
                });
              }
            }}
          >
            Copy policies
          </Button>
        </div>
      ) : null}

      <DataGrid
        table={table}
        recordCount={tableRows.length}
        tableLayout={ACADEMIC_STRUCTURE_TABLE_LAYOUT}
      >
        <Card>
          <CardTable>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter>
            <DataGridPagination sizes={[10, 25, 50]} />
          </CardFooter>
        </Card>
      </DataGrid>
    </div>
  );
}
