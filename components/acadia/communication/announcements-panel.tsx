'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { METRONIC_RESIZABLE_TABLE_LAYOUT } from '@/components/acadia/resizable-table-layout';
import {
  announcementAudienceLabel,
  announcementStatusLabel,
  isAnnouncementVisible,
  resolveAnnouncementLifecycleStatus,
} from '@/lib/acadia/communication';
import { formatDateTime } from '@/lib/acadia/record-display';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { localizedText } from '@/lib/acadia/locale';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useTranslation } from '@/hooks/useTranslation';

type AnnouncementRow = {
  id: string;
  kind: string;
  titleEn: string;
  titleFr: string | null;
  audience: string;
  status: string;
  publishAt: string | null;
  publishedAt: string | null;
  eventStartsAt: string | null;
  createdAt: string;
};

export function AnnouncementsPanel({
  kindFilter,
  publishedOnly = false,
  canManage = false,
}: {
  kindFilter?: 'BROADCAST' | 'EVENT';
  publishedOnly?: boolean;
  canManage?: boolean;
}) {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { publishAnnouncementNow } = useCommunicationMutations();

  const query = useQuery({
    queryKey: ['announcements', tenantId, kindFilter, publishedOnly],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let request = supabase
        .from('SchoolAnnouncement')
        .select(
          'id, kind, titleEn, titleFr, audience, status, publishAt, publishedAt, eventStartsAt, createdAt',
        )
        .eq('tenantId', tenantId!)
        .order('createdAt', { ascending: false });

      if (kindFilter) {
        request = request.eq('kind', kindFilter);
      }

      const { data, error } = await request;
      if (error) {
        throw error;
      }

      const rows = (data ?? []) as AnnouncementRow[];
      if (!publishedOnly) {
        return rows;
      }
      return rows.filter((row) => isAnnouncementVisible(row));
    },
    enabled: isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<AnnouncementRow>[]>(() => {
    const base: ColumnDef<AnnouncementRow>[] = [
      {
        accessorKey: 'titleEn',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('common.labels.title')} visibility column={column} />
        ),
        cell: ({ row }) => (
          <Link
            href={`/announcements/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {localizedText(row.original.titleEn, row.original.titleFr)}
          </Link>
        ),
        size: 240,
        enableSorting: true,
      },
      {
        id: 'kind',
        accessorFn: (row) => row.kind,
        header: ({ column }) => (
          <DataGridColumnHeader title={t('common.labels.type')} visibility column={column} />
        ),
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.kind === 'EVENT'
              ? t('communication.event')
              : t('communication.broadcast')}
          </Badge>
        ),
        size: 130,
        enableSorting: true,
      },
      {
        id: 'audience',
        accessorFn: (row) => row.audience,
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('communication.audienceLabel')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) =>
          t(`communication.audience.${row.original.audience}`, {
            defaultValue: announcementAudienceLabel(row.original.audience),
          }),
        size: 140,
        enableSorting: true,
      },
      {
        id: 'status',
        accessorFn: (row) => resolveAnnouncementLifecycleStatus(row),
        header: ({ column }) => (
          <DataGridColumnHeader title={t('common.labels.status')} visibility column={column} />
        ),
        cell: ({ row }) => {
          const effective = resolveAnnouncementLifecycleStatus(row.original);
          return (
            <Badge
              variant={effective === 'PUBLISHED' ? 'success' : 'secondary'}
              appearance="light"
            >
              {t(`communication.status.${effective}`, {
                defaultValue: announcementStatusLabel(effective),
              })}
            </Badge>
          );
        },
        size: 130,
        enableSorting: true,
      },
      {
        id: 'schedule',
        accessorFn: (row) => row.publishedAt ?? row.publishAt ?? '',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('communication.publish')} visibility column={column} />
        ),
        cell: ({ row }) =>
          row.original.publishedAt
            ? formatDateTime(row.original.publishedAt)
            : row.original.publishAt
              ? formatDateTime(row.original.publishAt)
              : '—',
        size: 180,
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
          const effective = resolveAnnouncementLifecycleStatus(row.original);
          if (effective === 'PUBLISHED' || effective === 'CANCELLED') {
            return null;
          }
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => publishAnnouncementNow.mutate(row.original.id)}
              disabled={publishAnnouncementNow.isPending}
            >
              {t('communication.publishNow')}
            </Button>
          );
        },
        size: 140,
        enableSorting: false,
        enableResizing: false,
      } satisfies ColumnDef<AnnouncementRow>,
    ];
  }, [canManage, publishAnnouncementNow, t]);

  const table = useReactTable({
    data: query.data ?? [],
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

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  return (
    <DataGrid
      table={table}
      recordCount={(query.data ?? []).length}
      isLoading={query.isLoading}
      tableLayout={METRONIC_RESIZABLE_TABLE_LAYOUT}
      tableClassNames={{ edgeCell: 'px-5' }}
    >
      <Card>
        <CardTable>
          {query.isLoading ? (
            <Skeleton className="h-48 w-full" />
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
