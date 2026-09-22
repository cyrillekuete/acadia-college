'use client';

import Link from 'next/link';
import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { StaffDangerZone } from '@/components/acadia/staff/staff-danger-zone';
import { StaffTeachingAssignmentsPanel } from '@/components/acadia/staff/staff-teaching-assignments-panel';
import { useStaffDetailQuery } from '@/hooks/use-staff-detail-query';
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

export default function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canEdit = canWriteRegistry(session?.roleSlug);
  const { data, isLoading, isError, error } = useStaffDetailQuery(id);

  useEffect(() => {
    if (data?.id && data.id !== id) {
      router.replace(`/staff/${data.id}`);
    }
  }, [data?.id, id, router]);

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
      actions={
        canEdit && data ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/staff/${data.id}/edit`}>{t('common.buttons.edit')}</Link>
          </Button>
        ) : undefined
      }
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <div className="space-y-5 lg:space-y-7.5">
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2 lg:gap-7.5">
            <div className="flex flex-col gap-5 lg:gap-7.5">
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
              {canEdit ? (
                <StaffDangerZone
                  staffProfileId={data.id}
                  staffCode={data.staffCode}
                  isActive={data.isActive}
                  deletedAt={data.deletedAt}
                  isLoading={isLoading}
                />
              ) : null}
            </div>
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
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
