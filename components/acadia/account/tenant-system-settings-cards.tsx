'use client';

import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import { useAcadiaTenant } from '@/hooks/use-acadia-tenant';
import { TenantSessionSettingsForm } from '@/components/acadia/admin/tenant-session-settings-form';
import { formatRecordValue } from '@/lib/acadia/record-display';

function formatModules(modules: string[]): string {
  if (modules.length === 0) {
    return '—';
  }
  return modules.join(', ');
}

export function TenantSystemSettingsCards() {
  const { data: tenant, isLoading, isError, error } = useAcadiaTenant();

  return (
    <AccountDataState
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={!tenant}
      emptyMessage="Institution settings not found for your tenant."
    >
      {tenant ? (
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <RecordDetailCard
            title="Regional & locale"
            fields={[
              { label: 'Locale', value: formatRecordValue(tenant.locale) },
              { label: 'Timezone', value: formatRecordValue(tenant.timezone) },
              {
                label: 'Academic year start month',
                value: formatRecordValue(tenant.academicYearStartMonth),
              },
            ]}
          />
          <RecordDetailCard
            title="Session & security"
            fields={[
              {
                label: 'Session timeout (minutes)',
                value: formatRecordValue(tenant.sessionTimeoutMinutes),
              },
              {
                label: 'Session warning (minutes)',
                value: formatRecordValue(tenant.sessionWarningMinutes),
              },
            ]}
          />
          <TenantSessionSettingsForm />
          <RecordDetailCard
            title="Academic policies"
            fields={[
              {
                label: 'Mark entry calendar policy',
                value: formatRecordValue(tenant.markEntryCalendarPolicy),
              },
              {
                label: 'Minimum attendance %',
                value: formatRecordValue(tenant.minimumAttendancePercent),
              },
              {
                label: 'Show attendance on transcript',
                value: formatRecordValue(tenant.showAttendanceOnTranscript),
              },
            ]}
          />
          <RecordDetailCard
            title="Modules & email"
            fields={[
              { label: 'Enabled modules', value: formatModules(tenant.enabledModules) },
              {
                label: 'Platform email relay',
                value: formatRecordValue(tenant.usePlatformEmailRelay),
              },
            ]}
          />
        </div>
      ) : null}
    </AccountDataState>
  );
}
