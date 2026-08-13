'use client';

import Link from 'next/link';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { MarksEntryGrid } from '@/components/acadia/assessment/marks-entry-grid';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAssessmentMutations } from '@/hooks/use-assessment-mutations';
import { canEditExamSession, examSessionTypeLabel } from '@/lib/acadia/assessment';
import { canWriteOperations } from '@/lib/acadia/roles';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  formatDateTime,
  sequenceLabel,
  termLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';
import { localizedText } from '@/lib/acadia/locale';
import { useTranslation } from '@/hooks/useTranslation';

const EXAM_SELECT = `
  id,
  type,
  finalizedAt,
  startsOn,
  endsOn,
  subjectId,
  academicYearId,
  termId,
  sequenceId,
  Subject!ExamSession_subjectId_tenantId_fkey ( code, nameEn, nameFr ),
  Term!ExamSession_semesterId_tenantId_fkey ( number ),
  AcademicSequence:sequenceId ( number, numberInTerm )
`;

type ExamForResults = {
  id: string;
  type: string;
  finalizedAt: string | null;
  startsOn: string;
  endsOn: string;
  subjectId: string;
  academicYearId: string;
  termId: string;
  sequenceId: string | null;
  Subject: unknown;
  Term: unknown;
  AcademicSequence: unknown;
};

export function ExamResultsPanel({ examSessionId }: { examSessionId: string }) {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);
  const { finalizeExamSession } = useAssessmentMutations();

  const { data, isLoading, isError, error } = useSupabaseRecord<ExamForResults>(
    'ExamSession',
    examSessionId,
    EXAM_SELECT,
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('exams.loading')}</p>;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : t('exams.notFound')}
      </p>
    );
  }

  const subject = unwrapRelation<{ code?: string; nameEn?: string; nameFr?: string }>(
    data.Subject,
  );
  const term = unwrapRelation<{ number?: number }>(data.Term);
  const sequence = unwrapRelation<{ number?: number; numberInTerm?: number }>(
    data.AcademicSequence,
  );
  const editable = canManage && canEditExamSession(data.finalizedAt);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <p>
          <span className="font-medium">{t('common.labels.type')}:</span>{' '}
          {t(`exams.type.${data.type}`, { defaultValue: examSessionTypeLabel(data.type) })}
        </p>
        <p>
          <span className="font-medium">{t('marks.subject')}:</span>{' '}
          {subject?.code} — {localizedText(subject?.nameEn, subject?.nameFr)}
        </p>
        <p>
          <span className="font-medium">{t('academics.term')}:</span> {termLabel(term)}
        </p>
        <p>
          <span className="font-medium">{t('marks.sequence')}:</span> {sequenceLabel(sequence)}
        </p>
        <p>
          <span className="font-medium">{t('exams.period')}:</span>{' '}
          {formatDateTime(data.startsOn)} — {formatDateTime(data.endsOn)}
        </p>
        <p>
          <span className="font-medium">{t('common.labels.status')}:</span>{' '}
          {data.finalizedAt
            ? t('exams.finalizedAt', { date: formatDateTime(data.finalizedAt) })
            : t('exams.open')}
        </p>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/exams/${examSessionId}/edit`}>{t('exams.editSession')}</Link>
          </Button>
          {editable ? (
            <Button
              size="sm"
              disabled={finalizeExamSession.isPending}
              onClick={() => void finalizeExamSession.mutateAsync(examSessionId)}
            >
              {finalizeExamSession.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                t('exams.finalize')
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {editable ? (
        <p className="text-sm text-muted-foreground">{t('exams.enterMarksHint')}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{t('exams.finalizedReadonly')}</p>
      )}

      {data.sequenceId ? (
        <MarksEntryGrid
          preset={{
            academicYearId: data.academicYearId,
            sequenceId: data.sequenceId,
            subjectId: data.subjectId,
            examSessionId: data.id,
            readOnly: !editable,
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('exams.linkSequenceHint')}{' '}
          <Link href="/marks/entry" className="text-primary underline">
            {t('marks.entryTitle')}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
