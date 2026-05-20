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
  Subject:subjectId ( code, nameEn ),
  Term:termId ( number ),
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
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);
  const { finalizeExamSession } = useAssessmentMutations();

  const { data, isLoading, isError, error } = useSupabaseRecord<ExamForResults>(
    'ExamSession',
    examSessionId,
    EXAM_SELECT,
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading exam…</p>;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : 'Exam session not found.'}
      </p>
    );
  }

  const subject = unwrapRelation<{ code?: string; nameEn?: string }>(data.Subject);
  const term = unwrapRelation<{ number?: number }>(data.Term);
  const sequence = unwrapRelation<{ number?: number; numberInTerm?: number }>(
    data.AcademicSequence,
  );
  const editable = canManage && canEditExamSession(data.finalizedAt);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <p>
          <span className="font-medium">Type:</span>{' '}
          {examSessionTypeLabel(data.type)}
        </p>
        <p>
          <span className="font-medium">Subject:</span>{' '}
          {subject?.code} — {subject?.nameEn}
        </p>
        <p>
          <span className="font-medium">Term:</span> {termLabel(term)}
        </p>
        <p>
          <span className="font-medium">Sequence:</span> {sequenceLabel(sequence)}
        </p>
        <p>
          <span className="font-medium">Period:</span>{' '}
          {formatDateTime(data.startsOn)} — {formatDateTime(data.endsOn)}
        </p>
        <p>
          <span className="font-medium">Status:</span>{' '}
          {data.finalizedAt ? `Finalized ${formatDateTime(data.finalizedAt)}` : 'Open'}
        </p>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/exams/${examSessionId}/edit`}>Edit session</Link>
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
                'Finalize results'
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {editable ? (
        <p className="text-sm text-muted-foreground">
          Enter or update marks below, then finalize when complete (FR-4.2.4).
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          This session is finalized. Marks are read-only.
        </p>
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
          Link this exam session to an academic sequence to enter marks, or use{' '}
          <Link href="/marks/entry" className="text-primary underline">
            marks entry
          </Link>
          .
        </p>
      )}
    </div>
  );
}
