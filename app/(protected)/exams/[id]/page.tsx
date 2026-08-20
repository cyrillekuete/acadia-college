'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { ExamSessionDangerZone } from '@/components/acadia/assessment/exam-session-danger-zone';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { canEditExamSession } from '@/lib/acadia/assessment';
import { formatDateOnlyDisplay } from '@/lib/acadia/dates';
import {
  formatDateTime,
  formatRecordValue,
  sequenceLabel,
  termLabel,
  streamLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteOperations } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';
import { requireBrowserClient } from '@/lib/supabase/client';

const EXAM_SELECT = `
  id,
  type,
  startsOn,
  endsOn,
  finalizedAt,
  createdAt,
  updatedAt,
  Subject!ExamSession_subjectId_tenantId_fkey ( code, nameEn, nameFr, subSystem, branch ),
  AcademicYear!ExamSession_academicYearId_tenantId_fkey ( label ),
  Term!ExamSession_semesterId_tenantId_fkey ( number ),
  AcademicSequence:sequenceId ( number, numberInTerm )
`;

type ExamSessionDetail = {
  id: string;
  type: string;
  startsOn: string;
  endsOn: string;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  Subject: unknown;
  AcademicYear: unknown;
  Term: unknown;
  AcademicSequence: unknown;
};

export default function ExamSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const { id } = use(params);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);
  const tenantId = session?.tenantId ?? null;
  const { data, isLoading, isError, error } = useSupabaseRecord<ExamSessionDetail>(
    'ExamSession',
    id,
    EXAM_SELECT,
  );
  const { data: markCount = 0 } = useQuery({
    queryKey: ['exam-session-mark-count', tenantId, id],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { count, error: countError } = await supabase
        .from('SubjectMark')
        .select('*', { count: 'exact', head: true })
        .eq('tenantId', tenantId!)
        .eq('examSessionId', id);
      if (countError) {
        throw countError;
      }
      return count ?? 0;
    },
    enabled: Boolean(tenantId && id && canManage),
  });

  const subject = unwrapRelation<{
    code?: string;
    nameEn?: string;
    subSystem?: string;
    branch?: string;
  }>(data?.Subject);
  const year = unwrapRelation<{ label?: string }>(data?.AcademicYear);
  const term = unwrapRelation<{ number?: number }>(data?.Term);
  const sequence = unwrapRelation<{ number?: number; numberInTerm?: number }>(
    data?.AcademicSequence,
  );

  const isFinalized = !!data?.finalizedAt;
  const editable = canEditExamSession(data?.finalizedAt);
  const title = data?.type
    ? `${t('exams.session')} — ${t(`exams.type.${data.type}`, { defaultValue: data.type })}`
    : t('exams.session');

  return (
    <RecordDetailShell
      title={title}
      description={t('exams.description')}
      backHref="/exams"
      backLabel={t('exams.backToExams')}
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data && canManage ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {editable ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/exams/${id}/edit`}>{t('common.buttons.edit')}</Link>
            </Button>
          ) : null}
          <Button size="sm" asChild>
            <Link href={`/exams/${id}/results`}>{t('exams.resultsTitle')}</Link>
          </Button>
        </div>
      ) : null}
      {data ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
          <RecordDetailCard
            title={t('exams.session')}
            fields={[
              {
                label: t('exams.filterType'),
                value: formatRecordValue(
                  t(`exams.type.${data.type}`, { defaultValue: data.type }),
                ),
              },
              { label: t('exams.starts'), value: formatDateOnlyDisplay(data.startsOn) },
              { label: t('exams.ends'), value: formatDateOnlyDisplay(data.endsOn) },
              {
                label: t('exams.finalized'),
                value: (
                  <Badge
                    variant={isFinalized ? 'success' : 'warning'}
                    appearance="light"
                  >
                    {isFinalized ? t('exams.finalized') : t('exams.open')}
                  </Badge>
                ),
              },
              { label: t('exams.finalizedOn'), value: formatDateTime(data.finalizedAt) },
              { label: t('common.labels.created', { defaultValue: 'Created' }), value: formatDateTime(data.createdAt) },
              { label: t('common.labels.updated', { defaultValue: 'Updated' }), value: formatDateTime(data.updatedAt) },
            ]}
          />
          <RecordDetailCard
            title={t('exams.academicContext')}
            fields={[
              { label: t('exams.subject'), value: formatRecordValue(subject?.nameEn ?? subject?.code) },
              {
                label: t('catalog.subSystemLabel'),
                value: streamLabel(subject?.subSystem, subject?.branch),
              },
              { label: t('exams.academicYear'), value: formatRecordValue(year?.label) },
              { label: t('exams.term'), value: termLabel(term) },
              { label: t('exams.sequenceRequired'), value: sequenceLabel(sequence) },
            ]}
          />
        </div>
      ) : null}
      {data && canManage ? (
        <div className="mt-5">
          <ExamSessionDangerZone
            examSessionId={data.id}
            finalizedAt={data.finalizedAt}
            markCount={markCount}
            isLoading={isLoading}
          />
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
