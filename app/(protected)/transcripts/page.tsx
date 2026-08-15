'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, unwrapRelation } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

type TranscriptRow = {
  id: string;
  createdAt?: string;
  StudentProfile?: unknown;
  AcademicYear?: unknown;
  Term?: unknown;
  TranscriptVersion?: unknown;
} & Record<string, unknown>;

function studentLabel(row: TranscriptRow): string {
  const profile = unwrapRelation<{
    id?: string;
    registrationNumber?: string;
    User?: unknown;
  }>(row.StudentProfile);
  const user = unwrapRelation<{ name?: string }>(profile?.User);
  return user?.name?.trim() || profile?.registrationNumber?.trim() || '—';
}

function studentId(row: TranscriptRow): string | null {
  const profile = unwrapRelation<{ id?: string }>(row.StudentProfile);
  return profile?.id ?? null;
}

function yearLabel(row: TranscriptRow): string {
  const year = unwrapRelation<{ label?: string }>(row.AcademicYear);
  return year?.label?.trim() || '—';
}

function termLabel(row: TranscriptRow): string {
  const term = unwrapRelation<{ number?: number }>(row.Term);
  return term?.number != null ? `Term ${term.number}` : '—';
}

function currentVersion(row: TranscriptRow) {
  return unwrapRelation<{
    issuedAt?: string;
    status?: string;
    versionNumber?: number;
  }>(row.TranscriptVersion);
}

const columns: ColumnDef<TranscriptRow>[] = [
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
    id: 'year',
    header: 'Year',
    cell: ({ row }) => yearLabel(row.original),
  },
  {
    id: 'term',
    header: 'Term',
    cell: ({ row }) => termLabel(row.original),
  },
  {
    id: 'issuedAt',
    header: 'Issued',
    cell: ({ row }) => formatDateTime(currentVersion(row.original)?.issuedAt),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = currentVersion(row.original)?.status;
      if (!status) {
        return '—';
      }
      return (
        <Badge
          variant={status === 'READY' ? 'success' : 'secondary'}
          appearance="light"
          size="sm"
        >
          {status}
        </Badge>
      );
    },
  },
];

const TRANSCRIPT_SELECT = `
  id,
  createdAt,
  StudentProfile!Transcript_studentProfileId_tenantId_fkey (
    id,
    registrationNumber,
    User!StudentProfile_userId_tenantId_fkey ( name )
  ),
  AcademicYear!Transcript_academicYearId_tenantId_fkey ( label ),
  Term!Transcript_semesterId_tenantId_fkey ( number ),
  TranscriptVersion!Transcript_currentVersionId_fkey ( issuedAt, status, versionNumber )
`;

export default function Page() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell title={t('transcripts.title')} description={t('transcripts.description')}>
      <SupabaseTableList
        scopeByAcademicYear
        table="Transcript"
        title={t('transcripts.title')}
        select={TRANSCRIPT_SELECT}
        columns={columns}
        searchKeys={[]}
      />
    </AcadiaPageShell>
  );
}
