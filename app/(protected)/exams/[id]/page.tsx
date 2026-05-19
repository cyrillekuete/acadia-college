'use client';

import { use } from 'react';
import { Badge } from '@/components/ui/badge';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import {
  formatDateTime,
  formatRecordValue,
  sequenceLabel,
  termLabel,
  specialtyLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';

const EXAM_SELECT = `
  id,
  type,
  startsOn,
  endsOn,
  finalizedAt,
  createdAt,
  updatedAt,
  Course:courseId ( code, nameEn, nameFr ),
  AcademicYear:academicYearId ( label ),
  Term:termId ( number ),
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
  Course: unknown;
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
  const { data, isLoading, isError, error } = useSupabaseRecord<ExamSessionDetail>(
    'ExamSession',
    id,
    EXAM_SELECT,
  );

  const course = unwrapRelation<{ code?: string; nameEn?: string }>(data?.Course);
  const year = unwrapRelation<{ label?: string }>(data?.AcademicYear);
  const term = unwrapRelation<{ number?: number }>(data?.Term);
  const sequence = unwrapRelation<{ number?: number; numberInTerm?: number }>(
    data?.AcademicSequence,
  );

  const isFinalized = !!data?.finalizedAt;
  const title = data?.type ? `Exam — ${data.type}` : 'Exam session';

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
      {data ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
          <RecordDetailCard
            title="Exam session"
            fields={[
              { label: 'Type', value: formatRecordValue(data.type) },
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
              { label: 'Course', value: specialtyLabel(course) },
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
