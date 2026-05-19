'use client';

import { use } from 'react';
import { FeeAccountInstallments } from '@/components/acadia/finance/fee-account-installments';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteFinance } from '@/lib/acadia/roles';
import { formatRecordValue, unwrapRelation } from '@/lib/acadia/record-display';
import { formatMoneyMinor } from '@/lib/acadia/finance';

const ACCOUNT_SELECT = `
  id,
  feeCurrency,
  totalAmountMinor,
  createdAt,
  StudentProfile:studentProfileId (
    registrationNumber,
    User:userId ( name )
  ),
  AcademicYear:academicYearId ( label ),
  Specialty:specialtyId ( code, nameEn )
`;

type FeeAccountDetail = {
  id: string;
  feeCurrency: string;
  totalAmountMinor: number;
  createdAt: string;
  StudentProfile: unknown;
  AcademicYear: unknown;
  Specialty: unknown;
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
  const specialty = unwrapRelation<{ code?: string; nameEn?: string }>(
    data?.Specialty,
  );

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
                value: `${specialty?.code ?? '—'} ${specialty?.nameEn ?? ''}`.trim(),
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
          <FeeAccountInstallments accountId={data.id} readOnly={!canManage} />
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
