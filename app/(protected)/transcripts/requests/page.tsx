'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { CopyRequestListToolbar } from '@/components/acadia/transcripts/copy-request-list-toolbar';
import {
  TranscriptCopyRequestCreateForm,
  TranscriptCopyRequestReviewForm,
} from '@/components/acadia/transcripts/copy-request-forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { formatDateTime, unwrapRelation } from '@/lib/acadia/record-display';
import {
  canManageTranscripts,
  canRequestTranscriptCopy,
  copyRequestBadgeVariant,
  copyRequestMatchesSearch,
  copyRequestMatchesStudentSet,
  copyRequestRowMatchesStatusFilter,
  copyRequestStudentStanding,
  type CopyRequestListRow,
  type CopyRequestListStatusFilter,
} from '@/lib/acadia/transcripts';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useTranslation } from '@/hooks/useTranslation';

function studentLabel(row: CopyRequestListRow): string {
  const profile = unwrapRelation<{
    id?: string;
    registrationNumber?: string;
    User?: unknown;
  }>(row.StudentProfile);
  const user = unwrapRelation<{ name?: string }>(profile?.User);
  return user?.name?.trim() || profile?.registrationNumber?.trim() || '—';
}

function studentId(row: CopyRequestListRow): string | null {
  const profile = unwrapRelation<{ id?: string }>(row.StudentProfile);
  return profile?.id ?? row.studentProfileId ?? null;
}

function userName(value: unknown): string {
  const user = unwrapRelation<{ name?: string }>(value);
  return user?.name?.trim() || '—';
}

const REQUEST_SELECT = `
  id,
  status,
  createdAt,
  note,
  resolvedAt,
  studentProfileId,
  StudentProfile!TranscriptCopyRequest_studentProfileId_tenantId_fkey (
    id,
    registrationNumber,
    matriculeNumber,
    isActive,
    alumniSince,
    User!StudentProfile_userId_tenantId_fkey ( name )
  ),
  RequestedBy:requestedByUserId ( name ),
  ResolvedBy:resolvedByUserId ( name )
`;

export default function Page() {
  const { t } = useTranslation();
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManageTranscripts(session?.roleSlug);
  const canCreate = canRequestTranscriptCopy(session?.roleSlug);
  const { activeYearId } = useActiveAcademicYear();
  const [status, setStatus] = useState<CopyRequestListStatusFilter>('PENDING');
  const [yearScope, setYearScope] = useState<'all' | 'selected'>('all');
  const [reviewing, setReviewing] = useState<{
    id: string;
    studentProfileId: string;
    status: string;
  } | null>(null);

  const yearStudentsQuery = useQuery({
    queryKey: ['transcript-copy-year-students', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StudentEnrollment')
        .select('studentProfileId')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!);
      if (error) {
        throw error;
      }
      return new Set(
        (data ?? [])
          .map((row) => String(row.studentProfileId ?? ''))
          .filter(Boolean),
      );
    },
    enabled:
      yearScope === 'selected' &&
      Boolean(activeYearId) &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  const allowedStudentIds =
    yearScope === 'selected' && yearStudentsQuery.data
      ? yearStudentsQuery.data
      : null;

  const columns = useMemo<ColumnDef<CopyRequestListRow>[]>(() => {
    const base: ColumnDef<CopyRequestListRow>[] = [
      {
        id: 'student',
        header: t('transcripts.student'),
        cell: ({ row }) => {
          const profileId = studentId(row.original);
          const profile = unwrapRelation<{
            isActive?: boolean;
            alumniSince?: string | null;
          }>(row.original.StudentProfile);
          const standing = copyRequestStudentStanding({
            isActive: profile?.isActive,
            alumniSince: profile?.alumniSince,
          });
          const label = studentLabel(row.original);
          const standingLabel =
            standing === 'alumni'
              ? t('transcripts.alumni')
              : standing === 'inactive'
                ? t('transcripts.inactive')
                : null;
          return (
            <div className="flex flex-col gap-1">
              {profileId ? (
                <Link
                  href={`/students/${profileId}`}
                  className="font-medium text-primary hover:underline"
                >
                  {label}
                </Link>
              ) : (
                label
              )}
              {standingLabel ? (
                <span className="text-xs text-muted-foreground">{standingLabel}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'requestedBy',
        header: t('transcripts.requestedBy'),
        cell: ({ row }) => userName(row.original.RequestedBy),
      },
      {
        accessorKey: 'status',
        header: t('transcripts.status'),
        cell: ({ row }) => {
          const value = String(row.original.status ?? 'PENDING');
          return (
            <Badge
              variant={copyRequestBadgeVariant(value)}
              appearance="light"
              size="sm"
            >
              {value}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('transcripts.requested'),
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'note',
        header: t('transcripts.note'),
        cell: ({ row }) => (
          <span className="max-w-xs truncate">
            {row.original.note?.trim() || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'resolvedAt',
        header: t('transcripts.resolved'),
        cell: ({ row }) => formatDateTime(row.original.resolvedAt as string | undefined),
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
          const current = String(row.original.status ?? 'PENDING');
          const profileId = studentId(row.original);
          if (current !== 'PENDING' || !profileId) {
            return null;
          }
          return (
            <div className="text-right">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setReviewing({
                    id: row.original.id,
                    studentProfileId: profileId,
                    status: current,
                  })
                }
              >
                {t('transcripts.review')}
              </Button>
            </div>
          );
        },
      },
    ];
  }, [canManage, t]);

  return (
    <AcadiaPageShell
      title={t('transcripts.requestsTitle')}
      description={t('transcripts.requestsDescription')}
    >
      <div className="space-y-6">
        {canCreate ? <TranscriptCopyRequestCreateForm /> : null}
        {reviewing && canManage ? (
          <TranscriptCopyRequestReviewForm
            requestId={reviewing.id}
            studentProfileId={reviewing.studentProfileId}
            currentStatus={reviewing.status}
            onClose={() => setReviewing(null)}
          />
        ) : null}
        <SupabaseTableList
          table="TranscriptCopyRequest"
          title={t('transcripts.requestsTitle')}
          select={REQUEST_SELECT}
          columns={columns}
          searchFn={copyRequestMatchesSearch}
          rowFilter={(row) =>
            copyRequestRowMatchesStatusFilter(row, status) &&
            copyRequestMatchesStudentSet(studentId(row), allowedStudentIds)
          }
          order={{ column: 'createdAt', ascending: false }}
          limit={500}
          truncatedLabel={t('transcripts.truncated', { count: 500 })}
          toolbarExtra={
            <CopyRequestListToolbar
              status={status}
              onStatusChange={setStatus}
              yearScope={yearScope}
              onYearScopeChange={setYearScope}
            />
          }
        />
      </div>
    </AcadiaPageShell>
  );
}
