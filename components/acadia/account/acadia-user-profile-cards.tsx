'use client';

import { Badge } from '@/components/ui/badge';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { formatRecordValue } from '@/lib/acadia/record-display';

export function AcadiaUserProfileCards() {
  const { data: session, isLoading, isError, error } = useAcadiaCollegeSession();
  const profile = session?.profile;
  const authUser = session?.authUser;

  return (
    <AccountDataState
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={!profile}
      emptyMessage="No Acadia user profile linked to this account."
    >
      {profile ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
          <RecordDetailCard
            title="Personal info"
            fields={[
              { label: 'Name', value: formatRecordValue(profile.name) },
              { label: 'Email', value: formatRecordValue(profile.email) },
              {
                label: 'Role',
                value: profile.UserRole ? (
                  <Badge variant="primary" appearance="light">
                    {profile.UserRole.name}
                  </Badge>
                ) : (
                  '—'
                ),
              },
              { label: 'Status', value: formatRecordValue(profile.status) },
            ]}
          />
          <RecordDetailCard
            title="Sign-in"
            fields={[
              {
                label: 'Auth email',
                value: formatRecordValue(authUser?.email),
              },
              {
                label: 'Email confirmed',
                value: formatRecordValue(true),
              },
              {
                label: 'User ID',
                value: formatRecordValue(profile.id),
              },
              {
                label: 'Tenant ID',
                value: formatRecordValue(profile.tenantId),
              },
            ]}
          />
        </div>
      ) : null}
    </AccountDataState>
  );
}
