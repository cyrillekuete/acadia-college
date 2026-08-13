'use client';

import { use } from 'react';
import Link from 'next/link';
import { Pencil } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { ApplicationReviewActions } from '@/components/acadia/enrollment/application-review-actions';
import {
  applicantDisplayName,
  canEditEnrollmentApplication,
} from '@/lib/acadia/enrollment';
import {
  formatDateTime,
  formatPhoneRecordValue,
  formatRecordValue,
  levelLabel,
  streamLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

const APPLICATION_SELECT = `
  id,
  kind,
  status,
  firstNameEn,
  lastNameEn,
  firstNameFr,
  lastNameFr,
  email,
  phone,
  dateOfBirth,
  subSystem,
  branch,
  levelId,
  rejectionReason,
  reviewedAt,
  createdAt,
  Level!EnrollmentApplication_levelId_tenantId_fkey ( number, labelEn ),
  AcademicYear!EnrollmentApplication_academicYearId_tenantId_fkey ( label ),
  StudentProfile!EnrollmentApplication_studentProfileId_tenantId_fkey ( id, registrationNumber )
`;

type ApplicationDetail = {
  id: string;
  kind: string;
  status: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameFr?: string | null;
  lastNameFr?: string | null;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  subSystem: string;
  branch: string;
  levelId: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  Level?: unknown;
  AcademicYear?: unknown;
  StudentProfile?: unknown;
};

export default function EnrollmentApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const { id } = use(params);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);

  const { data, isLoading, isError, error } = useSupabaseRecord<ApplicationDetail>(
    'EnrollmentApplication',
    id,
    APPLICATION_SELECT,
  );

  const level = unwrapRelation<{ number?: number; labelEn?: string }>(data?.Level);
  const year = unwrapRelation<{ label?: string }>(data?.AcademicYear);
  const student = unwrapRelation<{ id?: string; registrationNumber?: string }>(
    data?.StudentProfile,
  );

  const title = data
    ? applicantDisplayName(
        data.firstNameEn,
        data.lastNameEn,
        data.firstNameFr,
        data.lastNameFr,
      )
    : t('enrollment.applicationDetails');

  return (
    <RecordDetailShell
      title={title}
      description="Application review and enrollment workflow."
      backHref="/enrollment/applications"
      backLabel="Back to applications"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge
              variant={data.status === 'APPROVED' ? 'success' : 'secondary'}
              appearance="light"
            >
              {data.status}
            </Badge>
            <div className="flex flex-wrap gap-2">
              {canManage && canEditEnrollmentApplication(data.status) ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/enrollment/applications/${id}/edit`}>
                    <Pencil className="size-4" />
                    Edit
                  </Link>
                </Button>
              ) : null}
              {canManage ? (
                <ApplicationReviewActions
                  applicationId={id}
                  status={data.status}
                  levelId={data.levelId as string}
                  subSystem={data.subSystem}
                  branch={data.branch}
                />
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <RecordDetailCard
              title="Applicant"
              fields={[
                { label: 'Email', value: formatRecordValue(data.email) },
                { label: 'Phone', value: formatPhoneRecordValue(data.phone) },
                {
                  label: 'Date of birth',
                  value: formatRecordValue(data.dateOfBirth),
                },
                { label: 'Type', value: formatRecordValue(data.kind) },
                { label: 'Submitted', value: formatDateTime(data.createdAt) },
              ]}
            />
            <RecordDetailCard
              title="Placement"
              fields={[
                { label: 'Academic year', value: formatRecordValue(year?.label) },
                {
                  label: 'Sub-system / branch',
                  value: streamLabel(data.subSystem, data.branch),
                },
                { label: 'Level', value: levelLabel(level) },
              ]}
            />
          </div>

          {data.status === 'REJECTED' && data.rejectionReason ? (
            <RecordDetailCard
              title="Rejection"
              fields={[
                { label: 'Reason', value: data.rejectionReason },
                { label: 'Reviewed', value: formatDateTime(data.reviewedAt) },
              ]}
            />
          ) : null}

          {student?.registrationNumber ? (
            <RecordDetailCard
              title="Student record"
              fields={[
                {
                  label: 'Student ID',
                  value: (
                    <Link
                      href={`/students/${student.id}`}
                      className="text-primary hover:underline"
                    >
                      {student.registrationNumber}
                    </Link>
                  ),
                },
                { label: 'Approved', value: formatDateTime(data.reviewedAt) },
              ]}
            />
          ) : null}
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
