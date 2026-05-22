'use client';

import { Badge } from '@/components/ui/badge';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { applicantDisplayName } from '@/lib/acadia/enrollment';
import {
  formatDateTime,
  formatPhoneRecordValue,
  formatRecordValue,
  levelLabel,
  streamLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';

export type EnrollmentConfirmationData = {
  id: string;
  status: string;
  kind: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameFr?: string | null;
  lastNameFr?: string | null;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  subSystem?: string | null;
  branch?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  Level?: unknown;
  AcademicYear?: unknown;
  StudentProfile?: unknown;
};

export function EnrollmentConfirmationView({
  data,
}: {
  data: EnrollmentConfirmationData;
}) {
  const level = unwrapRelation<{ number?: number; labelEn?: string }>(data.Level);
  const year = unwrapRelation<{ label?: string }>(data.AcademicYear);
  const student = unwrapRelation<{ id?: string; registrationNumber?: string }>(
    data.StudentProfile,
  );

  const applicant = applicantDisplayName(
    data.firstNameEn,
    data.lastNameEn,
    data.firstNameFr,
    data.lastNameFr,
  );

  return (
    <div className="print:p-8 space-y-6">
      <div className="text-center print:mb-8">
        <h2 className="text-2xl font-semibold">Acadia College</h2>
        <p className="text-muted-foreground">Enrollment confirmation</p>
        <Badge variant="success" appearance="light" className="mt-3">
          {data.status}
        </Badge>
      </div>

      <RecordDetailCard
        title="Applicant"
        fields={[
          { label: 'Name', value: applicant },
          { label: 'Email', value: formatRecordValue(data.email) },
          { label: 'Phone', value: formatPhoneRecordValue(data.phone) },
          { label: 'Date of birth', value: formatRecordValue(data.dateOfBirth) },
          { label: 'Application type', value: formatRecordValue(data.kind) },
        ]}
      />

      <RecordDetailCard
        title="Academic placement"
        fields={[
          { label: 'Academic year', value: formatRecordValue(year?.label) },
          {
            label: 'Sub-system / branch',
            value: streamLabel(data.subSystem, data.branch),
          },
          { label: 'Level', value: levelLabel(level) },
        ]}
      />

      {student?.registrationNumber ? (
        <RecordDetailCard
          title="Student record"
          fields={[
            {
              label: 'Student ID',
              value: formatRecordValue(student.registrationNumber),
            },
            { label: 'Approved on', value: formatDateTime(data.reviewedAt) },
            { label: 'Submitted on', value: formatDateTime(data.createdAt) },
          ]}
        />
      ) : null}

      <p className="text-xs text-muted-foreground print:mt-12">
        This document confirms enrollment approval for the academic year listed
        above. Keep a copy for your records.
      </p>
    </div>
  );
}
