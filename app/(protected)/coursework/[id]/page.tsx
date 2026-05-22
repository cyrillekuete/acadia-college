'use client';

import { use } from 'react';
import { Badge } from '@/components/ui/badge';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import {
  formatDateTime,
  formatRecordValue,
  streamLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';

const TASK_SELECT = `
  id,
  titleEn,
  titleFr,
  descriptionEn,
  descriptionFr,
  dueAt,
  maxScore,
  isPublished,
  createdAt,
  updatedAt,
  Subject!CourseworkTask_subjectId_tenantId_fkey ( code, nameEn, nameFr, subSystem, branch ),
  AcademicYear!CourseworkTask_academicYearId_tenantId_fkey ( label )
`;

type CourseworkTaskDetail = {
  id: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string | null;
  descriptionFr: string | null;
  dueAt: string;
  maxScore: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  Subject: unknown;
  AcademicYear: unknown;
};

export default function CourseworkTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, error } =
    useSupabaseRecord<CourseworkTaskDetail>(
      'CourseworkTask',
      id,
      TASK_SELECT,
    );

  const subject = unwrapRelation<{
    code?: string;
    nameEn?: string;
    subSystem?: string;
    branch?: string;
  }>(data?.Subject);
  const year = unwrapRelation<{ label?: string }>(data?.AcademicYear);

  const title = data?.titleEn ? `Coursework — ${data.titleEn}` : 'Coursework task';

  return (
    <RecordDetailShell
      title={title}
      description="Coursework task from Supabase."
      backHref="/coursework"
      backLabel="Back to coursework"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
          <RecordDetailCard
            title="Task"
            fields={[
              { label: 'Title (EN)', value: formatRecordValue(data.titleEn) },
              { label: 'Title (FR)', value: formatRecordValue(data.titleFr) },
              { label: 'Due', value: formatDateTime(data.dueAt) },
              { label: 'Max score', value: formatRecordValue(data.maxScore) },
              {
                label: 'Published',
                value: (
                  <Badge
                    variant={data.isPublished ? 'success' : 'secondary'}
                    appearance="light"
                  >
                    {data.isPublished ? 'Yes' : 'No'}
                  </Badge>
                ),
              },
              {
                label: 'Description (EN)',
                value: formatRecordValue(data.descriptionEn),
              },
              {
                label: 'Description (FR)',
                value: formatRecordValue(data.descriptionFr),
              },
              { label: 'Created', value: formatDateTime(data.createdAt) },
              { label: 'Updated', value: formatDateTime(data.updatedAt) },
            ]}
          />
          <RecordDetailCard
            title="Context"
            fields={[
              { label: 'Subject', value: formatRecordValue(subject?.nameEn ?? subject?.code) },
              {
                label: 'Stream',
                value: streamLabel(subject?.subSystem, subject?.branch),
              },
              { label: 'Academic year', value: formatRecordValue(year?.label) },
            ]}
          />
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
