'use client';

import { use } from 'react';
import { Badge } from '@/components/ui/badge';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import {
  formatDateTime,
  formatRecordValue,
  levelLabel,
  termLabel,
  specialtyLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';

const COURSE_SELECT = `
  id,
  code,
  nameEn,
  nameFr,
  credits,
  hours,
  deactivatedAt,
  createdAt,
  updatedAt,
  Specialty:specialtyId ( code, nameEn, nameFr ),
  Level:levelId ( number ),
  Term:termId ( number )
`;

type CourseDetail = {
  id: string;
  code: string;
  nameEn: string;
  nameFr: string;
  credits: number;
  hours: number;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  Specialty: unknown;
  Level: unknown;
  Term: unknown;
};

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useSupabaseRecord<CourseDetail>(
    'Course',
    id,
    COURSE_SELECT,
  );

  const specialty = unwrapRelation<{ code?: string; nameEn?: string }>(
    data?.Specialty,
  );
  const level = unwrapRelation<{ number?: number }>(data?.Level);
  const term = unwrapRelation<{ number?: number }>(data?.Term);

  const isActive = !data?.deactivatedAt;
  const title = data?.code ? `Course — ${data.code}` : 'Course detail';

  return (
    <RecordDetailShell
      title={title}
      description="Course catalog entry from Supabase."
      backHref="/courses"
      backLabel="Back to courses"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
          <RecordDetailCard
            title="Course"
            fields={[
              { label: 'Code', value: formatRecordValue(data.code) },
              { label: 'Name (EN)', value: formatRecordValue(data.nameEn) },
              { label: 'Name (FR)', value: formatRecordValue(data.nameFr) },
              { label: 'Credits', value: formatRecordValue(data.credits) },
              { label: 'Hours', value: formatRecordValue(data.hours) },
              {
                label: 'Status',
                value: (
                  <Badge
                    variant={isActive ? 'success' : 'secondary'}
                    appearance="light"
                  >
                    {isActive ? 'Active' : 'Deactivated'}
                  </Badge>
                ),
              },
              { label: 'Deactivated at', value: formatDateTime(data.deactivatedAt) },
              { label: 'Created', value: formatDateTime(data.createdAt) },
              { label: 'Updated', value: formatDateTime(data.updatedAt) },
            ]}
          />
          <RecordDetailCard
            title="Academic placement"
            fields={[
              { label: 'Specialty', value: specialtyLabel(specialty) },
              { label: 'Level', value: levelLabel(level) },
              { label: 'Term', value: termLabel(term) },
            ]}
          />
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
