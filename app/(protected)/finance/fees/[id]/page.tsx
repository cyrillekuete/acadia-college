'use client';

import { use } from 'react';
import { FeeAccountInstallments } from '@/components/acadia/finance/fee-account-installments';
import { FeeAccountScholarships } from '@/components/acadia/finance/fee-account-scholarships';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteFinance } from '@/lib/acadia/roles';
import { formatRecordValue, streamLabel, unwrapRelation } from '@/lib/acadia/record-display';
import { formatMoneyMinor } from '@/lib/acadia/finance';

const ACCOUNT_SELECT = `
  id,
  feeCurrency,
  totalAmountMinor,
  createdAt,
  StudentProfile!StudentFeeAccount_studentProfileId_tenantId_fkey (
    registrationNumber,
    User!StudentProfile_userId_tenantId_fkey ( name )
  ),
  AcademicYear!StudentFeeAccount_academicYearId_tenantId_fkey ( label ),
  subSystem,
  branch
`;

type FeeAccountDetail = {
  id: string;
  feeCurrency: string;
  totalAmountMinor: number;
  createdAt: string;
  StudentProfile: unknown;
  AcademicYear: unknown;
  subSystem: string;
  branch: string;
};

export default function FeeAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteFinance(session?.roleSlug);
  const { data, isLoading, isError, error } = useSupabaseRecord<FeeAccountDetail>(
    'StudentFeeAccount',
    id,
    ACCOUNT_SELECT,
  );

  const profile = unwrapRelation<{
    registrationNumber?: string;
    User?: unknown;
  }>(data?.StudentProfile);
  const user = unwrapRelation<{ name?: string }>(profile?.User);
  const year = unwrapRelation<{ label?: string }>(data?.AcademicYear);

  const title = user?.name
    ? `Fees — ${user.name}`
    : 'Student fee account';

  return (
    <RecordDetailShell
      title={title}
      description="Payment status and installment schedule."
      backHref="/finance/fees"
      backLabel="Back to fees"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <div className="space-y-6">
          <RecordDetailCard
            title="Account"
            fields={[
              { label: 'Student', value: user?.name ?? '—' },
              { label: 'Registration', value: profile?.registrationNumber ?? '—' },
              { label: 'Year', value: year?.label ?? '—' },
              {
                label: 'Program',
                value: streamLabel(data.subSystem, data.branch),
              },
              {
                label: 'Total fees',
                value: formatMoneyMinor(
                  Number(data.totalAmountMinor),
                  data.feeCurrency,
                ),
              },
              {
                label: 'Opened',
                value: formatRecordValue(data.createdAt),
              },
            ]}
          />
          <FeeAccountScholarships accountId={data.id} readOnly={!canManage} />
          <FeeAccountInstallments accountId={data.id} readOnly={!canManage} />
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
