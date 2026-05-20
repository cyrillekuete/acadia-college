'use client';

import { use } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { examSessionTypeLabel } from '@/lib/acadia/assessment';
import {
  formatDateTime,
  formatRecordValue,
  sequenceLabel,
  termLabel,
  specialtyLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteOperations } from '@/lib/acadia/roles';

const EXAM_SELECT = `
  id,
  type,
  startsOn,
  endsOn,
  finalizedAt,
  createdAt,
  updatedAt,
  Subject!ExamSession_subjectId_tenantId_fkey ( code, nameEn, nameFr ),
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
  const { id } = use(params);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);
  const { data, isLoading, isError, error } = useSupabaseRecord<ExamSessionDetail>(
    'ExamSession',
    id,
    EXAM_SELECT,
  );

  const subject = unwrapRelation<{ code?: string; nameEn?: string }>(data?.Subject);
  const year = unwrapRelation<{ label?: string }>(data?.AcademicYear);
  const term = unwrapRelation<{ number?: number }>(data?.Term);
  const sequence = unwrapRelation<{ number?: number; numberInTerm?: number }>(
    data?.AcademicSequence,
  );

  const isFinalized = !!data?.finalizedAt;
  const title = data?.type
    ? `Exam — ${examSessionTypeLabel(data.type)}`
    : 'Exam session';

  return (
    <RecordDetailShell
      title={title}
      description="Exam session from Supabase."
      backHref="/exams"
      backLabel="Back to exams"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data && canManage ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/exams/${id}/edit`}>Edit</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/exams/${id}/results`}>Results</Link>
          </Button>
        </div>
      ) : null}
      {data ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
          <RecordDetailCard
            title="Exam session"
            fields={[
              {
                label: 'Type',
                value: formatRecordValue(examSessionTypeLabel(data.type)),
              },
              { label: 'Starts', value: formatDateTime(data.startsOn) },
              { label: 'Ends', value: formatDateTime(data.endsOn) },
              {
                label: 'Finalized',
                value: (
                  <Badge
                    variant={isFinalized ? 'success' : 'warning'}
                    appearance="light"
                  >
                    {isFinalized ? 'Yes' : 'Open'}
                  </Badge>
                ),
              },
              { label: 'Finalized at', value: formatDateTime(data.finalizedAt) },
              { label: 'Created', value: formatDateTime(data.createdAt) },
              { label: 'Updated', value: formatDateTime(data.updatedAt) },
            ]}
          />
          <RecordDetailCard
            title="Academic context"
            fields={[
              { label: 'Subject', value: specialtyLabel(subject) },
              { label: 'Academic year', value: formatRecordValue(year?.label) },
              { label: 'Term', value: termLabel(term) },
              { label: 'Sequence', value: sequenceLabel(sequence) },
            ]}
          />
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
