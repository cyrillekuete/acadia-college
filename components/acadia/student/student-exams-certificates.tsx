'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import {
  formatDateTime,
  formatRecordValue,
  unwrapRelation,
} from '@/lib/acadia/record-display';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { Skeleton } from '@/components/ui/skeleton';

export function StudentExamsCertificates({
  studentProfileId,
}: {
  studentProfileId: string;
}) {
  const { data: session, isLoading: sessionLoading, isError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  const { data, isLoading } = useQuery({
    queryKey: ['student-exams-certificates', tenantId, studentProfileId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();

      const { data: enrollments, error: enrollError } = await supabase
        .from('StudentEnrollment')
        .select('academicYearId')
        .eq('tenantId', tenantId!)
        .eq('studentProfileId', studentProfileId);

      if (enrollError) {
        throw enrollError;
      }

      const enrollmentYearIds = Array.from(
        new Set(
          (enrollments ?? [])
            .map((e) => e.academicYearId as string)
            .filter(Boolean),
        ),
      );
      const yearIds = activeYearId
        ? enrollmentYearIds.filter((id) => id === activeYearId)
        : enrollmentYearIds;

      let exams: Record<string, unknown>[] = [];
      if (yearIds.length > 0) {
        const { data: examData, error: examError } = await supabase
          .from('ExamSession')
          .select(
            `
            id,
            type,
            startsOn,
            endsOn,
            Subject!ExamSession_subjectId_tenantId_fkey ( code, nameEn )
          `,
          )
          .eq('tenantId', tenantId!)
          .in('academicYearId', yearIds)
          .order('startsOn', { ascending: false })
          .limit(15);
        if (examError) {
          throw examError;
        }
        exams = examData ?? [];
      }

      let transcriptQuery = supabase
        .from('Transcript')
        .select(
          `
          id,
          createdAt,
          termId,
          academicYearId,
          AcademicYear!Transcript_academicYearId_tenantId_fkey ( label ),
          Term!Transcript_semesterId_tenantId_fkey ( number ),
          TranscriptVersion!Transcript_currentVersionId_fkey ( issuedAt, status )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('studentProfileId', studentProfileId);
      if (activeYearId) {
        transcriptQuery = transcriptQuery.eq('academicYearId', activeYearId);
      }
      const { data: transcripts, error: transcriptError } = await transcriptQuery
        .order('createdAt', { ascending: false })
        .limit(10);

      if (transcriptError) {
        throw transcriptError;
      }

      const { data: copyRequests, error: copyError } = await supabase
        .from('TranscriptCopyRequest')
        .select('id, status, createdAt')
        .eq('tenantId', tenantId!)
        .eq('studentProfileId', studentProfileId)
        .order('createdAt', { ascending: false })
        .limit(10);

      if (copyError) {
        throw copyError;
      }

      return {
        exams,
        transcripts: transcripts ?? [],
        copyRequests: copyRequests ?? [],
      };
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      isError,
      session,
      tenantId,
    ),
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const exams = data?.exams ?? [];
  const transcripts = data?.transcripts ?? [];
  const copyRequests = data?.copyRequests ?? [];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <RecordDetailCard
        title="Examination sessions"
        fields={
          exams.length === 0
            ? [{ label: 'Records', value: 'No exam sessions for enrolled years.' }]
            : exams.map((row) => {
                const subject = unwrapRelation<{ code?: string; nameEn?: string }>(
                  row.Subject,
                );
                const label = String(subject?.nameEn ?? subject?.code ?? row.id);
                return {
                  label,
                  value: (
                    <Link
                      href={`/exams/${row.id}`}
                      className="text-primary hover:underline"
                    >
                      {formatRecordValue(row.type as string)} ·{' '}
                      {formatDateTime(row.startsOn as string)}
                    </Link>
                  ),
                };
              })
        }
      />
      <RecordDetailCard
        title="Transcripts & certificates"
        fields={[
          ...(transcripts.length === 0
            ? [{ label: 'Transcripts', value: 'None issued.' }]
            : transcripts.map((row) => {
                const version = unwrapRelation<{
                  issuedAt?: string;
                  status?: string;
                }>(row.TranscriptVersion);
                const term = unwrapRelation<{ number?: number }>(row.Term);
                const year = unwrapRelation<{ label?: string }>(row.AcademicYear);
                const termPart =
                  term?.number != null ? `Term ${term.number}` : 'Term';
                const yearPart = year?.label?.trim() || '—';
                return {
                  label: `${termPart} · ${yearPart}`,
                  value: `${formatRecordValue(version?.status)} · ${formatDateTime(version?.issuedAt)}`,
                };
              })),
          ...(copyRequests.length === 0
            ? [{ label: 'Copy requests (all years)', value: 'None.' }]
            : [
                ...copyRequests.map((row, index) => ({
                  label: `Copy request ${index + 1}`,
                  value: `${formatRecordValue(row.status)} · ${formatDateTime(row.createdAt as string)}`,
                })),
                ...(copyRequests.length >= 10
                  ? [
                      {
                        label: 'Copy requests',
                        value: 'Showing latest 10 across all years.',
                      },
                    ]
                  : [
                      {
                        label: 'Copy requests',
                        value: 'All years.',
                      },
                    ]),
              ]),
        ]}
      />
    </div>
  );
}
