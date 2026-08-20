'use client';

import Link from 'next/link';
import { use } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { StaffDangerZone } from '@/components/acadia/staff/staff-danger-zone';
import { StaffTeachingAssignmentsPanel } from '@/components/acadia/staff/staff-teaching-assignments-panel';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { staffEmploymentLabel } from '@/lib/acadia/staff-registry';
import { subSystemLabel } from '@/lib/acadia/education-system';
import {
  formatDateTime,
  formatPhoneRecordValue,
  formatRecordValue,
  unwrapRelation,
} from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

const STAFF_SELECT = `
  id,
  staffCode,
  title,
  firstName,
  lastName,
  personalEmail,
  phone,
  address,
  city,
  region,
  qualifications,
  teachingExperience,
  subSystem,
  employmentType,
  hireDate,
  monthlySalary,
  emergencyContactName,
  emergencyContactRelationship,
  emergencyContactPhone,
  officeRoom,
  officePhone,
  bio,
  isActive,
  createdAt,
  updatedAt,
  User!StaffProfile_userId_tenantId_fkey ( id, email, name, status, country, timezone, lastSignInAt ),
  Department!StaffProfile_departmentId_tenantId_fkey ( code, nameEn, nameFr )
`;

type StaffDetail = {
  id: string;
  staffCode: string | null;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  personalEmail: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  qualifications: string | null;
  teachingExperience: string | null;
  subSystem: string | null;
  employmentType: string;
  hireDate: string | null;
  monthlySalary: number | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
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
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canEdit = canWriteRegistry(session?.roleSlug);
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

  const displayName = [data?.title, data?.firstName, data?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const title = data?.staffCode
    ? `Staff — ${data.staffCode}`
    : displayName
      ? `Staff — ${displayName}`
      : 'Staff profile';

  return (
    <RecordDetailShell
      title={title}
      description={t('staff.description')}
      backHref="/staff"
      backLabel={t('staff.backToList')}
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <div className="space-y-5 lg:space-y-7.5">
          {canEdit ? (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/staff/${data.id}/edit`}>{t('common.buttons.edit')}</Link>
              </Button>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
            <RecordDetailCard
              title={t('staff.personalInfo')}
              fields={[
                { label: t('staff.staffCode'), value: formatRecordValue(data.staffCode) },
                { label: t('common.labels.title'), value: formatRecordValue(data.title) },
                {
                  label: t('common.labels.fullName'),
                  value: formatRecordValue(displayName || user?.name),
                },
                {
                  label: t('staff.contactEmail'),
                  value: formatRecordValue(data.personalEmail),
                },
                {
                  label: t('staff.mobilePhone'),
                  value: formatPhoneRecordValue(data.phone),
                },
                {
                  label: t('common.labels.address'),
                  value: formatRecordValue(
                    [data.address, data.city, data.region].filter(Boolean).join(', '),
                  ),
                },
                {
                  label: t('common.labels.status'),
                  value: (
                    <Badge
                      variant={data.isActive ? 'success' : 'secondary'}
                      appearance="light"
                    >
                      {data.isActive
                        ? t('common.labels.active')
                        : t('common.labels.inactive')}
                    </Badge>
                  ),
                },
              ]}
            />
            <RecordDetailCard
              title={t('staff.teachingAssignment')}
              fields={[
                {
                  label: t('staff.employmentType'),
                  value: staffEmploymentLabel(data.employmentType),
                },
                { label: t('staff.department'), value: departmentLabel },
                {
                  label: t('academics.subSystem'),
                  value: data.subSystem ? subSystemLabel(data.subSystem) : '—',
                },
                { label: t('staff.startDate'), value: formatDateTime(data.hireDate) },
                {
                  label: t('staff.monthlySalary'),
                  value:
                    data.monthlySalary != null
                      ? formatRecordValue(String(data.monthlySalary))
                      : '—',
                },
                {
                  label: t('staff.officeRoom'),
                  value: formatRecordValue(data.officeRoom),
                },
                {
                  label: t('staff.officePhone'),
                  value: formatPhoneRecordValue(data.officePhone),
                },
                { label: t('common.labels.date'), value: formatDateTime(data.createdAt) },
              ]}
            />
            <RecordDetailCard
              title={t('staff.emergencyContact')}
              fields={[
                {
                  label: t('common.labels.name'),
                  value: formatRecordValue(data.emergencyContactName),
                },
                {
                  label: t('common.labels.relationship'),
                  value: formatRecordValue(data.emergencyContactRelationship),
                },
                {
                  label: t('staff.contactPhone'),
                  value: formatPhoneRecordValue(data.emergencyContactPhone),
                },
              ]}
            />
            <div className="flex flex-col gap-5 lg:gap-7.5">
              <RecordDetailCard
                title={t('staff.yourAccount')}
                fields={[
                  { label: t('common.labels.name'), value: formatRecordValue(user?.name) },
                  {
                    label: t('common.labels.email'),
                    value: formatRecordValue(user?.email),
                  },
                  {
                    label: t('common.labels.status'),
                    value: formatRecordValue(user?.status),
                  },
                  {
                    label: t('common.labels.country'),
                    value: formatRecordValue(user?.country),
                  },
                  {
                    label: 'Last sign-in',
                    value: formatDateTime(user?.lastSignInAt),
                  },
                ]}
              />
              {data.qualifications || data.teachingExperience || data.bio ? (
                <RecordDetailCard
                  title={t('staff.addressQualifications')}
                  fields={[
                    {
                      label: t('staff.qualifications'),
                      value: formatRecordValue(data.qualifications),
                    },
                    {
                      label: t('staff.teachingExperience'),
                      value: formatRecordValue(data.teachingExperience),
                    },
                    {
                      label: t('staff.shortBio'),
                      value: formatRecordValue(data.bio),
                    },
                  ]}
                />
              ) : null}
              <StaffTeachingAssignmentsPanel staffProfileId={data.id} />
            </div>
          </div>
          {canEdit ? (
            <StaffDangerZone
              staffProfileId={data.id}
              staffCode={data.staffCode}
              isActive={data.isActive}
              isLoading={isLoading}
            />
          ) : null}
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
