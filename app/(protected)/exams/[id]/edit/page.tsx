'use client';

import { use } from 'react';
import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import {
  ExamSessionForm,
  type ExamSessionFormRecord,
} from '@/components/acadia/assessment/exam-session-form';
import { Button } from '@/components/ui/button';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canEditExamSession } from '@/lib/acadia/assessment';
import { canWriteOperations } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

const SELECT = `
  id,
  academicYearId,
  subjectId,
  termId,
  sequenceId,
  type,
  startsOn,
  endsOn,
  finalizedAt
`;

type ExamEdit = ExamSessionFormRecord & { finalizedAt: string | null };

export default function EditExamSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const { id } = use(params);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);
  const { data, isLoading, isError, error } = useSupabaseRecord<ExamEdit>(
    'ExamSession',
    id,
    SELECT,
  );

  const editable = data ? canEditExamSession(data.finalizedAt) : false;

  return (
    <AcadiaPageShell
      title={t('exams.editTitle')}
      description="Update examination dates and academic placement."
    >
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/exams/${id}`}>Back to exam</Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError || !data ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Exam not found.'}
        </p>
      ) : !canManage ? (
        <p className="text-sm text-muted-foreground">Permission denied.</p>
      ) : !editable ? (
        <p className="text-sm text-muted-foreground">
          This exam session is finalized and cannot be edited.
        </p>
      ) : (
        <ExamSessionForm
          record={{
            id: data.id,
            academicYearId: data.academicYearId,
            subjectId: data.subjectId,
            termId: data.termId,
            sequenceId: data.sequenceId ?? '',
            type: data.type as ExamSessionFormRecord['type'],
            startsOn: data.startsOn,
            endsOn: data.endsOn,
          }}
          onCancelHref={`/exams/${id}`}
        />
      )}
    </AcadiaPageShell>
  );
}
