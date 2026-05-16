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
  specialtyLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';

const STUDENT_SELECT = `
  id,
  registrationNumber,
  isActive,
  alumniSince,
  alumniDirectoryOptIn,
  createdAt,
  updatedAt,
  User:userId ( id, email, name, status, country, timezone, lastSignInAt ),
  Specialty:specialtyId ( code, nameEn, nameFr ),
  Level:currentLevelId ( number )
`;

type StudentDetail = {
  id: string;
  registrationNumber: string;
  isActive: boolean;
  alumniSince: string | null;
  alumniDirectoryOptIn: boolean;
  createdAt: string;
  updatedAt: string;
  User: unknown;
  Specialty: unknown;
  Level: unknown;
};

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useSupabaseRecord<StudentDetail>(
    'StudentProfile',
    id,
    STUDENT_SELECT,
  );

  const user = unwrapRelation<{
    email?: string;
    name?: string;
    status?: string;
    country?: string;
    timezone?: string;
    lastSignInAt?: string;
  }>(data?.User);

  const specialty = unwrapRelation<{ code?: string; nameEn?: string }>(
    data?.Specialty,
  );
  const level = unwrapRelation<{ number?: number }>(data?.Level);

  const title = data?.registrationNumber
    ? `Student — ${data.registrationNumber}`
    : 'Student profile';

  return (
    <RecordDetailShell
      title={title}
      description="Student registry profile from Supabase."
      backHref="/students"
      backLabel="Back to students"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
          <RecordDetailCard
            title="Student"
            fields={[
              { label: 'Matricule', value: formatRecordValue(data.registrationNumber) },
              {
                label: 'Status',
                value: (
                  <Badge
                    variant={data.isActive ? 'success' : 'secondary'}
                    appearance="light"
                  >
                    {data.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                ),
              },
              { label: 'Specialty', value: specialtyLabel(specialty) },
              { label: 'Current level', value: levelLabel(level) },
              { label: 'Alumni since', value: formatDateTime(data.alumniSince) },
              {
                label: 'Alumni directory',
                value: formatRecordValue(data.alumniDirectoryOptIn),
              },
              { label: 'Created', value: formatDateTime(data.createdAt) },
              { label: 'Updated', value: formatDateTime(data.updatedAt) },
            ]}
          />
          <RecordDetailCard
            title="Linked user account"
            fields={[
              { label: 'Name', value: formatRecordValue(user?.name) },
              { label: 'Email', value: formatRecordValue(user?.email) },
              { label: 'Account status', value: formatRecordValue(user?.status) },
              { label: 'Country', value: formatRecordValue(user?.country) },
              { label: 'Timezone', value: formatRecordValue(user?.timezone) },
              { label: 'Last sign-in', value: formatDateTime(user?.lastSignInAt) },
            ]}
          />
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
