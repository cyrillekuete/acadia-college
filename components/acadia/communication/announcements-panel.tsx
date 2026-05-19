'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Card, CardHeader, CardTable } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  announcementAudienceLabel,
  announcementStatusLabel,
  isAnnouncementVisible,
  resolveAnnouncementLifecycleStatus,
} from '@/lib/acadia/communication';
import { formatDateTime } from '@/lib/acadia/record-display';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';

type AnnouncementRow = {
  id: string;
  kind: string;
  titleEn: string;
  audience: string;
  status: string;
  publishAt: string | null;
  publishedAt: string | null;
  eventStartsAt: string | null;
  createdAt: string;
};

const columns: ColumnDef<AnnouncementRow>[] = [
  {
    accessorKey: 'titleEn',
    header: 'Title',
    cell: ({ row }) => (
      <Link
        href={`/announcements/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.titleEn}
      </Link>
    ),
  },
  {
    id: 'kind',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.kind === 'EVENT' ? 'Event' : 'Broadcast'}
      </Badge>
    ),
  },
  {
    id: 'audience',
    header: 'Audience',
    cell: ({ row }) => announcementAudienceLabel(row.original.audience),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const effective = resolveAnnouncementLifecycleStatus(row.original);
      return (
        <Badge
          variant={effective === 'PUBLISHED' ? 'success' : 'secondary'}
          appearance="light"
        >
          {announcementStatusLabel(effective)}
        </Badge>
      );
    },
  },
  {
    id: 'schedule',
    header: 'Publish',
    cell: ({ row }) =>
      row.original.publishedAt
        ? formatDateTime(row.original.publishedAt)
        : row.original.publishAt
          ? formatDateTime(row.original.publishAt)
          : '—',
  },
];

export function AnnouncementsPanel({
  kindFilter,
  publishedOnly = false,
  canManage = false,
}: {
  kindFilter?: 'BROADCAST' | 'EVENT';
  publishedOnly?: boolean;
  canManage?: boolean;
}) {
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
          'id, kind, titleEn, audience, status, publishAt, publishedAt, eventStartsAt, createdAt',
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

  const table = useReactTable({
    data: query.data ?? [],
    columns: canManage
      ? [
          ...columns,
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
                  Publish now
                </Button>
              );
            },
          } satisfies ColumnDef<AnnouncementRow>,
        ]
      : columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  return (
    <Card>
      <CardHeader className="py-4" />
      <CardTable>
        {query.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <DataGrid table={table} recordCount={(query.data ?? []).length}>
            <DataGridTable />
          </DataGrid>
        )}
      </CardTable>
    </Card>
  );
}
