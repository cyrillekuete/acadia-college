'use client';

import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import { useAcadiaTenant } from '@/hooks/use-acadia-tenant';
import { TenantSessionSettingsForm } from '@/components/acadia/admin/tenant-session-settings-form';
import { formatRecordValue } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

function formatModules(modules: string[]): string {
  if (modules.length === 0) {
    return '—';
  }
  return modules.join(', ');
}

export function TenantSystemSettingsCards() {
  const { t } = useTranslation();
  const { data: tenant, isLoading, isError, error } = useAcadiaTenant();

  return (
    <AccountDataState
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={!tenant}
      emptyMessage={t('account.institutionNotFound')}
    >
      {tenant ? (
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <RecordDetailCard
            title={t('account.regionalLocale')}
            fields={[
              { label: t('account.locale'), value: formatRecordValue(tenant.locale) },
              { label: t('admin.timezone'), value: formatRecordValue(tenant.timezone) },
              {
                label: t('account.academicYearStartMonth'),
                value: formatRecordValue(tenant.academicYearStartMonth),
              },
            ]}
          />
          <RecordDetailCard
            title={t('account.sessionSecurity')}
            fields={[
              {
                label: t('account.sessionTimeout'),
                value: formatRecordValue(tenant.sessionTimeoutMinutes),
              },
              {
                label: t('account.sessionWarning'),
                value: formatRecordValue(tenant.sessionWarningMinutes),
              },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            {t('account.sessionTimeoutAdminNote', {
              defaultValue:
                'Session timeout can be changed only by administrators and registrars.',
            })}
          </p>
          <TenantSessionSettingsForm />
          <RecordDetailCard
            title={t('account.academicPolicies')}
            fields={[
              {
                label: t('account.markEntryPolicy'),
                value: formatRecordValue(tenant.markEntryCalendarPolicy),
              },
              {
                label: t('account.minimumAttendance'),
                value: formatRecordValue(tenant.minimumAttendancePercent),
              },
              {
                label: t('account.showAttendanceOnTranscript'),
                value: formatRecordValue(tenant.showAttendanceOnTranscript),
              },
            ]}
          />
          <RecordDetailCard
            title={t('account.modulesEmail')}
            fields={[
              { label: t('account.enabledModules'), value: formatModules(tenant.enabledModules) },
              {
                label: t('account.platformEmailRelay'),
                value: formatRecordValue(tenant.usePlatformEmailRelay),
              },
            ]}
          />
        </div>
      ) : null}
    </AccountDataState>
  );
}
