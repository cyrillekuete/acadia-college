'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, unwrapRelation } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

type RequestRow = {
  id: string;
  status?: string;
  createdAt?: string;
  note?: string | null;
  StudentProfile?: unknown;
} & Record<string, unknown>;

function studentLabel(row: RequestRow): string {
  const profile = unwrapRelation<{
    id?: string;
    registrationNumber?: string;
    User?: unknown;
  }>(row.StudentProfile);
  const user = unwrapRelation<{ name?: string }>(profile?.User);
  return user?.name?.trim() || profile?.registrationNumber?.trim() || '—';
}

function studentId(row: RequestRow): string | null {
  const profile = unwrapRelation<{ id?: string }>(row.StudentProfile);
  return profile?.id ?? null;
}

const columns: ColumnDef<RequestRow>[] = [
  {
    id: 'student',
    header: 'Student',
    cell: ({ row }) => {
      const profileId = studentId(row.original);
      const label = studentLabel(row.original);
      if (!profileId) {
        return label;
      }
      return (
        <Link
          href={`/students/${profileId}`}
          className="font-medium text-primary hover:underline"
        >
          {label}
        </Link>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = String(row.original.status ?? 'PENDING');
      return (
        <Badge
          variant={status === 'FULFILLED' ? 'success' : 'secondary'}
          appearance="light"
          size="sm"
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Requested',
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
];

const REQUEST_SELECT = `
  id,
  status,
  createdAt,
  note,
  StudentProfile!TranscriptCopyRequest_studentProfileId_tenantId_fkey (
    id,
    registrationNumber,
    User!StudentProfile_userId_tenantId_fkey ( name )
  )
`;

export default function Page() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('transcripts.requestsTitle')}
      description={t('transcripts.requestsDescription')}
    >
      <SupabaseTableList
        table="TranscriptCopyRequest"
        title={t('transcripts.requestsTitle')}
        select={REQUEST_SELECT}
        columns={columns}
        searchKeys={['status']}
      />
    </AcadiaPageShell>
  );
}
