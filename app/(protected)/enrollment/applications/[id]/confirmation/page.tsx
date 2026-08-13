'use client';

import { use } from 'react';
import { Printer } from '@/lib/icons';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import {
  EnrollmentConfirmationView,
  type EnrollmentConfirmationData,
} from '@/components/acadia/enrollment/enrollment-confirmation-view';
import { Button } from '@/components/ui/button';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useTranslation } from '@/hooks/useTranslation';

const CONFIRMATION_SELECT = `
  id,
  status,
  kind,
  firstNameEn,
  lastNameEn,
  firstNameFr,
  lastNameFr,
  email,
  phone,
  dateOfBirth,
  subSystem,
  branch,
  reviewedAt,
  createdAt,
  Level!EnrollmentApplication_levelId_tenantId_fkey ( number, labelEn ),
  AcademicYear!EnrollmentApplication_academicYearId_tenantId_fkey ( label ),
  StudentProfile!EnrollmentApplication_studentProfileId_tenantId_fkey ( id, registrationNumber )
`;

export default function EnrollmentConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const { id } = use(params);
  const { data, isLoading, isError, error } =
    useSupabaseRecord<EnrollmentConfirmationData>(
      'EnrollmentApplication',
      id,
      CONFIRMATION_SELECT,
    );

  return (
    <RecordDetailShell
      title={t('enrollment.confirmation')}
      description="Printable confirmation for approved applications (FR-2.1.4)."
      backHref={`/enrollment/applications/${id}`}
      backLabel="Back to application"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data?.status === 'APPROVED' ? (
        <>
          <div className="mb-4 flex justify-end print:hidden">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4" />
              Print
            </Button>
          </div>
          <EnrollmentConfirmationView data={data} />
        </>
      ) : data ? (
        <p className="text-sm text-muted-foreground">
          Confirmation is only available for approved applications.
        </p>
      ) : null}
    </RecordDetailShell>
  );
}
