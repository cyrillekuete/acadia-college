'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { TranscriptListToolbar } from '@/components/acadia/transcripts/transcript-list-toolbar';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, unwrapRelation } from '@/lib/acadia/record-display';
import {
  currentTranscriptVersion,
  transcriptMatchesSearch,
  transcriptRowMatchesStatusFilter,
  transcriptVersionBadgeVariant,
  type TranscriptListRow,
  type TranscriptListStatusFilter,
} from '@/lib/acadia/transcripts';
import { useTranslation } from '@/hooks/useTranslation';

function studentLabel(row: TranscriptListRow): string {
  const profile = unwrapRelation<{
    id?: string;
    registrationNumber?: string;
    User?: unknown;
  }>(row.StudentProfile);
  const user = unwrapRelation<{ name?: string }>(profile?.User);
  return user?.name?.trim() || profile?.registrationNumber?.trim() || '—';
}

function studentId(row: TranscriptListRow): string | null {
  const profile = unwrapRelation<{ id?: string }>(row.StudentProfile);
  return profile?.id ?? null;
}

function yearLabel(row: TranscriptListRow): string {
  const year = unwrapRelation<{ label?: string }>(row.AcademicYear);
  return year?.label?.trim() || '—';
}

function termLabel(row: TranscriptListRow, termPrefix: string): string {
  const term = unwrapRelation<{ number?: number }>(row.Term);
  return term?.number != null ? `${termPrefix} ${term.number}` : '—';
}

const TRANSCRIPT_SELECT = `
  id,
  createdAt,
  currentVersionId,
  StudentProfile!Transcript_studentProfileId_tenantId_fkey (
    id,
    registrationNumber,
    matriculeNumber,
    User!StudentProfile_userId_tenantId_fkey ( name )
  ),
  AcademicYear!Transcript_academicYearId_tenantId_fkey ( label ),
  Term!Transcript_semesterId_tenantId_fkey ( number ),
  TranscriptVersion!Transcript_currentVersionId_fkey ( issuedAt, status, versionNumber )
`;

export default function Page() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<TranscriptListStatusFilter>('ready');

  const columns = useMemo<ColumnDef<TranscriptListRow>[]>(
    () => [
      {
        id: 'student',
        header: t('transcripts.student'),
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
        header: t('transcripts.year'),
        cell: ({ row }) => yearLabel(row.original),
      },
      {
        id: 'term',
        header: t('transcripts.term'),
        cell: ({ row }) => termLabel(row.original, t('transcripts.term')),
      },
      {
        id: 'version',
        header: t('transcripts.version'),
        cell: ({ row }) => {
          const version = currentTranscriptVersion(row.original);
          if (!version || row.original.currentVersionId == null) {
            return t('transcripts.noVersion');
          }
          return String(version.versionNumber ?? '—');
        },
      },
      {
        id: 'issuedAt',
        header: t('transcripts.issued'),
        cell: ({ row }) =>
          formatDateTime(currentTranscriptVersion(row.original)?.issuedAt),
      },
      {
        id: 'status',
        header: t('transcripts.status'),
        cell: ({ row }) => {
          const version = currentTranscriptVersion(row.original);
          const statusValue = version?.status;
          if (!statusValue || !row.original.currentVersionId) {
            return t('transcripts.noVersion');
          }
          return (
            <Badge
              variant={transcriptVersionBadgeVariant(statusValue)}
              appearance="light"
              size="sm"
            >
              {statusValue}
            </Badge>
          );
        },
      },
    ],
    [t],
  );

  return (
    <AcadiaPageShell title={t('transcripts.title')} description={t('transcripts.description')}>
      <SupabaseTableList
        scopeByAcademicYear
        table="Transcript"
        title={t('transcripts.title')}
        select={TRANSCRIPT_SELECT}
        columns={columns}
        searchFn={transcriptMatchesSearch}
        rowFilter={(row) => transcriptRowMatchesStatusFilter(row, status)}
        order={{ column: 'createdAt', ascending: false }}
        limit={500}
        truncatedLabel={t('transcripts.truncated', { count: 500 })}
        toolbarExtra={
          <TranscriptListToolbar status={status} onStatusChange={setStatus} />
        }
      />
    </AcadiaPageShell>
  );
}
