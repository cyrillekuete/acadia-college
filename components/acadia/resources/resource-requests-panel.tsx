'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
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
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  resourceRequestReviewSchema,
  resourceRequestSchema,
  type ResourceRequestFormValues,
  type ResourceRequestReviewValues,
} from '@/lib/acadia/resources-schemas';
import { resourceRequestStatusLabel } from '@/lib/acadia/resources';
import { useResourceMutations } from '@/hooks/use-resource-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canManageResources, canRequestResources } from '@/lib/acadia/roles';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { Skeleton } from '@/components/ui/skeleton';

export function ResourceRequestsPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManageResources(session?.roleSlug);
  const canRequest = canRequestResources(session?.roleSlug);
  const { submitResourceRequest, reviewResourceRequest } = useResourceMutations();
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const resourcesQuery = useQuery({
    queryKey: ['school-resources', tenantId, 'active-only'],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('SchoolResource')
        .select('id, code, nameEn')
        .eq('tenantId', tenantId!)
        .eq('isActive', true)
        .order('code');
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      sessionError,
      session,
      tenantId,
    ),
  });

  const requestsQuery = useQuery({
    queryKey: ['resource-requests', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('ResourceRequest')
        .select(
          `
          id,
          quantity,
          purpose,
          status,
          createdAt,
          reviewNotes,
          SchoolResource:resourceId ( code, nameEn ),
          Requester:requestedByUserId ( name )
        `,
        )
        .eq('tenantId', tenantId!)
        .order('createdAt', { ascending: false });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      sessionError,
      session,
      tenantId,
    ),
  });

  const requestForm = useForm<ResourceRequestFormValues>({
    resolver: zodResolver(resourceRequestSchema),
    defaultValues: { resourceId: '', quantity: 1, purpose: '' },
  });

  const reviewForm = useForm<ResourceRequestReviewValues>({
    resolver: zodResolver(resourceRequestReviewSchema),
    defaultValues: { status: 'APPROVED', reviewNotes: '' },
  });

  if (requestsQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {getQueryErrorMessage(requestsQuery.error)}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {canRequest ? (
        <Form {...requestForm}>
          <form
            onSubmit={requestForm.handleSubmit((values) =>
              submitResourceRequest.mutate(values, {
                onSuccess: () => requestForm.reset(),
              }),
            )}
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
          >
            <FormField
              control={requestForm.control}
              name="resourceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select resource" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(resourcesQuery.data ?? []).map((row) => (
                        <SelectItem key={row.id as string} value={row.id as string}>
                          {String(row.code)} — {String(row.nameEn)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={requestForm.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={requestForm.control}
              name="purpose"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="md:col-span-2">
              Submit request
            </Button>
          </form>
        </Form>
      ) : null}

      <ResourceRequestsTable
        data={(requestsQuery.data ?? []).map((row) => {
          const resource = unwrapRelation<{ code?: string; nameEn?: string }>(
            row.SchoolResource,
          );
          const requester = unwrapRelation<{ name?: string }>(row.Requester);
          return {
            id: row.id as string,
            resourceLabel: `${resource?.code ?? ''} — ${resource?.nameEn ?? ''}`,
            requester: requester?.name ?? '—',
            quantity: Number(row.quantity),
            status: String(row.status),
            purpose: String(row.purpose ?? ''),
          };
        })}
        isLoading={requestsQuery.isLoading}
        canManage={canManage}
        onReview={setReviewingId}
      />

      {reviewingId && canManage ? (
        <Form {...reviewForm}>
          <form
            onSubmit={reviewForm.handleSubmit((values) =>
              reviewResourceRequest.mutate(
                { requestId: reviewingId, values },
                { onSuccess: () => setReviewingId(null) },
              ),
            )}
            className="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-2"
          >
            <FormField
              control={reviewForm.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        ['APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED'] as const
                      ).map((value) => (
                        <SelectItem key={value} value={value}>
                          {resourceRequestStatusLabel(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={reviewForm.control}
              name="reviewNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">Save review</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReviewingId(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      ) : null}
    </div>
  );
}

type ResourceRequestRow = {
  id: string;
  resourceLabel: string;
  requester: string;
  quantity: number;
  status: string;
  purpose: string;
};

function ResourceRequestsTable({
  data,
  isLoading,
  canManage,
  onReview,
}: {
  data: ResourceRequestRow[];
  isLoading: boolean;
  canManage: boolean;
  onReview: (id: string) => void;
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'resourceLabel',
    'requester',
    'quantity',
    'status',
    'purpose',
    'actions',
  ]);

  const columns = useMemo<ColumnDef<ResourceRequestRow>[]>(() => {
    const base: ColumnDef<ResourceRequestRow>[] = [
      {
        accessorKey: 'resourceLabel',
        header: ({ column }) => (
          <DataGridColumnHeader title="Resource" visibility column={column} />
        ),
        cell: ({ row }) => row.original.resourceLabel,
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: 'requester',
        header: ({ column }) => (
          <DataGridColumnHeader title="Requester" visibility column={column} />
        ),
        cell: ({ row }) => row.original.requester,
        size: 180,
        enableSorting: true,
      },
      {
        accessorKey: 'quantity',
        header: ({ column }) => (
          <DataGridColumnHeader title="Qty" visibility column={column} />
        ),
        cell: ({ row }) => row.original.quantity,
        size: 80,
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) => (
          <Badge variant="outline">
            {resourceRequestStatusLabel(row.original.status)}
          </Badge>
        ),
        size: 130,
        enableSorting: true,
      },
      {
        accessorKey: 'purpose',
        header: ({ column }) => (
          <DataGridColumnHeader title="Purpose" visibility column={column} />
        ),
        cell: ({ row }) => (
          <span className="max-w-xs truncate">{row.original.purpose}</span>
        ),
        size: 240,
        enableSorting: true,
      },
    ];

    if (!canManage) {
      return base;
    }

    return [
      ...base,
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const status = row.original.status;
          if (status !== 'PENDING' && status !== 'APPROVED') {
            return null;
          }
          return (
            <div className="text-right">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReview(row.original.id)}
              >
                Review
              </Button>
            </div>
          );
        },
        size: 120,
        enableSorting: false,
      } satisfies ColumnDef<ResourceRequestRow>,
    ];
  }, [canManage, onReview]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination, columnOrder },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setColumnOrder,
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
      isLoading={isLoading}
      tableLayout={METRONIC_RESIZABLE_TABLE_LAYOUT}
      tableClassNames={{
        edgeCell: 'px-5',
      }}
    >
      <Card>
        <CardTable>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
