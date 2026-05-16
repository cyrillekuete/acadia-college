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

const STAFF_SELECT = `
  id,
  staffCode,
  title,
  employmentType,
  hireDate,
  officeRoom,
  officePhone,
  bio,
  isActive,
  createdAt,
  updatedAt,
  User:userId ( id, email, name, status, country, timezone, lastSignInAt ),
  Department:departmentId ( code, nameEn, nameFr )
`;

type StaffDetail = {
  id: string;
  staffCode: string | null;
  title: string | null;
  employmentType: string;
  hireDate: string | null;
  officeRoom: string | null;
  officePhone: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  User: unknown;
  Department: unknown;
};

export default function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useSupabaseRecord<StaffDetail>(
    'StaffProfile',
    id,
    STAFF_SELECT,
  );

  const user = unwrapRelation<{
    email?: string;
    name?: string;
    status?: string;
    country?: string;
    timezone?: string;
    lastSignInAt?: string;
  }>(data?.User);

  const department = unwrapRelation<{
    code?: string;
    nameEn?: string;
  }>(data?.Department);

  const departmentLabel = department
    ? [department.code, department.nameEn].filter(Boolean).join(' — ') || '—'
    : '—';

  const title = data?.staffCode
    ? `Staff — ${data.staffCode}`
    : data?.title
      ? `Staff — ${data.title}`
      : 'Staff profile';

  return (
    <RecordDetailShell
      title={title}
      description="Staff profile from Supabase."
      backHref="/staff"
      backLabel="Back to staff"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
          <RecordDetailCard
            title="Staff"
            fields={[
              { label: 'Staff code', value: formatRecordValue(data.staffCode) },
              { label: 'Title', value: formatRecordValue(data.title) },
              { label: 'Employment', value: formatRecordValue(data.employmentType) },
              { label: 'Department', value: departmentLabel },
              { label: 'Hire date', value: formatDateTime(data.hireDate) },
              { label: 'Office room', value: formatRecordValue(data.officeRoom) },
              { label: 'Office phone', value: formatRecordValue(data.officePhone) },
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
              { label: 'Created', value: formatDateTime(data.createdAt) },
              { label: 'Updated', value: formatDateTime(data.updatedAt) },
            ]}
          />
          <div className="flex flex-col gap-5 lg:gap-7.5">
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
            {data.bio ? (
              <RecordDetailCard
                title="Bio"
                fields={[{ label: 'Summary', value: formatRecordValue(data.bio) }]}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
