'use client';

import { use } from 'react';
import { Badge } from '@/components/ui/badge';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import {
  formatDateTime,
  formatRecordValue,
  unwrapRelation,
} from '@/lib/acadia/record-display';

const SUBMISSION_SELECT = `
  id,
  status,
  fileStorageKey,
  originalFileName,
  mimeType,
  fileSize,
  submittedAt,
  confirmedScore,
  confirmedAt,
  createdAt,
  updatedAt,
  CourseworkTask:taskId ( titleEn, dueAt, maxScore ),
  StudentProfile:studentProfileId ( registrationNumber )
`;

type SubmissionDetail = {
  id: string;
  status: string;
  fileStorageKey: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  submittedAt: string | null;
  confirmedScore: number | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  CourseworkTask: unknown;
  StudentProfile: unknown;
};

export default function CourseworkSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, error } =
    useSupabaseRecord<SubmissionDetail>(
      'CourseworkSubmission',
      id,
      SUBMISSION_SELECT,
    );

  const task = unwrapRelation<{
    titleEn?: string;
    dueAt?: string;
    maxScore?: number;
  }>(data?.CourseworkTask);
  const student = unwrapRelation<{ registrationNumber?: string }>(
    data?.StudentProfile,
  );

  const title = student?.registrationNumber
    ? `Submission — ${student.registrationNumber}`
    : 'Coursework submission';

  return (
    <RecordDetailShell
      title={title}
      description="Student coursework submission from Supabase."
      backHref="/coursework"
      backLabel="Back to coursework"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
          <RecordDetailCard
            title="Submission"
            fields={[
              {
                label: 'Status',
                value: (
                  <Badge variant="primary" appearance="light">
                    {data.status}
                  </Badge>
                ),
              },
              { label: 'Submitted', value: formatDateTime(data.submittedAt) },
              { label: 'Confirmed score', value: formatRecordValue(data.confirmedScore) },
              { label: 'Confirmed at', value: formatDateTime(data.confirmedAt) },
              { label: 'File name', value: formatRecordValue(data.originalFileName) },
              { label: 'MIME type', value: formatRecordValue(data.mimeType) },
              { label: 'File size', value: formatRecordValue(data.fileSize) },
              { label: 'Storage key', value: formatRecordValue(data.fileStorageKey) },
              { label: 'Created', value: formatDateTime(data.createdAt) },
              { label: 'Updated', value: formatDateTime(data.updatedAt) },
            ]}
          />
          <RecordDetailCard
            title="Linked records"
            fields={[
              { label: 'Task', value: formatRecordValue(task?.titleEn) },
              { label: 'Task due', value: formatDateTime(task?.dueAt) },
              { label: 'Task max score', value: formatRecordValue(task?.maxScore) },
              {
                label: 'Student matricule',
                value: formatRecordValue(student?.registrationNumber),
              },
            ]}
          />
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
