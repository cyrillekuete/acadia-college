'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EditableSettingsCard } from '@/components/acadia/account/editable-settings-card';
import { TenantLogoPreview } from '@/components/acadia/account/tenant-logo-preview';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import { useAcadiaTenant } from '@/hooks/use-acadia-tenant';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTenantProfileMutations } from '@/hooks/use-tenant-profile-mutations';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRecordValue } from '@/lib/acadia/record-display';
import { canWriteAcademicAdmin } from '@/lib/acadia/roles';

export function TenantInstitutionCards() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const { data: tenant, isLoading, isError, error } = useAcadiaTenant();
  const { updateField } = useTenantProfileMutations();
  const canEdit = canWriteAcademicAdmin(session?.roleSlug);

  return (
    <AccountDataState
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={!tenant}
      emptyMessage="Institution record not found for your tenant."
    >
      {tenant ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-7.5">
          <TenantLogoPreview />
          <EditableSettingsCard
            title={t('account.generalInfo', { defaultValue: 'General info' })}
            canEdit={canEdit}
            pending={updateField.isPending}
            onSave={(field, value) => updateField.mutate({ field, value })}
            rows={[
              {
                key: 'displayNameEn',
                label: t('account.nameEn', { defaultValue: 'Name (EN)' }),
                display: formatRecordValue(tenant.displayNameEn),
                rawValue: tenant.displayNameEn,
                field: 'displayNameEn',
              },
              {
                key: 'displayNameFr',
                label: t('account.nameFr', { defaultValue: 'Name (FR)' }),
                display: formatRecordValue(tenant.displayNameFr),
                rawValue: tenant.displayNameFr,
                field: 'displayNameFr',
              },
              {
                key: 'slug',
                label: t('account.slug', { defaultValue: 'Slug' }),
                display: formatRecordValue(tenant.slug),
                rawValue: tenant.slug,
                copyable: true,
              },
              {
                key: 'status',
                label: t('account.status', { defaultValue: 'Status' }),
                display: (
                  <Badge variant="success" appearance="light">
                    {tenant.status}
                  </Badge>
                ),
                rawValue: tenant.status,
              },
              {
                key: 'deployment',
                label: t('account.deployment', { defaultValue: 'Deployment' }),
                display: formatRecordValue(tenant.deploymentMode),
                rawValue: tenant.deploymentMode,
              },
              {
                key: 'plan',
                label: t('account.plan', { defaultValue: 'Plan' }),
                display: formatRecordValue(tenant.planSlug),
                rawValue: tenant.planSlug,
              },
              {
                key: 'id',
                label: t('account.tenantId', { defaultValue: 'Tenant ID' }),
                display: formatRecordValue(tenant.id),
                rawValue: tenant.id,
                copyable: true,
              },
            ]}
          />
          <EditableSettingsCard
            title={t('account.contactAddress', { defaultValue: 'Contact & address' })}
            canEdit={canEdit}
            pending={updateField.isPending}
            onSave={(field, value) => updateField.mutate({ field, value })}
            rows={[
              {
                key: 'institutionEmail',
                label: t('account.institutionEmail', { defaultValue: 'Institution email' }),
                display: formatRecordValue(tenant.institutionEmail),
                rawValue: tenant.institutionEmail,
                field: 'institutionEmail',
                inputType: 'email',
              },
              {
                key: 'institutionPhone',
                label: t('account.institutionPhone', { defaultValue: 'Institution phone' }),
                display: formatRecordValue(tenant.institutionPhone),
                rawValue: tenant.institutionPhone,
                field: 'institutionPhone',
                inputType: 'tel',
              },
              {
                key: 'websiteUrl',
                label: t('account.website', { defaultValue: 'Website' }),
                display: tenant.websiteUrl ? (
                  <Link
                    href={tenant.websiteUrl}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {tenant.websiteUrl}
                  </Link>
                ) : (
                  formatRecordValue(tenant.websiteUrl)
                ),
                rawValue: tenant.websiteUrl,
                field: 'websiteUrl',
                inputType: 'url',
              },
              {
                key: 'addressLine1',
                label: t('account.addressLine1', { defaultValue: 'Address line 1' }),
                display: formatRecordValue(tenant.addressLine1),
                rawValue: tenant.addressLine1,
                field: 'addressLine1',
              },
              {
                key: 'city',
                label: t('account.city', { defaultValue: 'City' }),
                display: formatRecordValue(tenant.city),
                rawValue: tenant.city,
                field: 'city',
              },
              {
                key: 'region',
                label: t('account.region', { defaultValue: 'Region' }),
                display: formatRecordValue(tenant.region),
                rawValue: tenant.region,
                field: 'region',
              },
              {
                key: 'country',
                label: t('account.country', { defaultValue: 'Country' }),
                display: formatRecordValue(tenant.country),
                rawValue: tenant.country,
                field: 'country',
              },
            ]}
          />
          <EditableSettingsCard
            title={t('account.branding', { defaultValue: 'Branding' })}
            canEdit={canEdit}
            pending={updateField.isPending}
            onSave={(field, value) => updateField.mutate({ field, value })}
            rows={[
              {
                key: 'primaryColor',
                label: t('account.primaryColor', { defaultValue: 'Primary color' }),
                display: formatRecordValue(tenant.primaryColor),
                rawValue: tenant.primaryColor,
                field: 'primaryColor',
                inputType: 'color',
              },
              {
                key: 'accentColor',
                label: t('account.accentColor', { defaultValue: 'Accent color' }),
                display: formatRecordValue(tenant.accentColor),
                rawValue: tenant.accentColor,
                field: 'accentColor',
                inputType: 'color',
              },
              {
                key: 'logoStorageKey',
                label: t('account.logoStorageKey', { defaultValue: 'Logo storage key' }),
                display: formatRecordValue(tenant.logoStorageKey),
                rawValue: tenant.logoStorageKey,
                copyable: true,
              },
              {
                key: 'pdfIssuerDisplayNameEn',
                label: t('account.pdfIssuerEn', { defaultValue: 'PDF issuer (EN)' }),
                display: formatRecordValue(tenant.pdfIssuerDisplayNameEn),
                rawValue: tenant.pdfIssuerDisplayNameEn,
                field: 'pdfIssuerDisplayNameEn',
              },
              {
                key: 'pdfIssuerDisplayNameFr',
                label: t('account.pdfIssuerFr', { defaultValue: 'PDF issuer (FR)' }),
                display: formatRecordValue(tenant.pdfIssuerDisplayNameFr),
                rawValue: tenant.pdfIssuerDisplayNameFr,
                field: 'pdfIssuerDisplayNameFr',
              },
              {
                key: 'customDomain',
                label: t('account.customDomain', { defaultValue: 'Custom domain' }),
                display: formatRecordValue(tenant.customDomain),
                rawValue: tenant.customDomain,
                field: 'customDomain',
              },
            ]}
          />
        </div>
      ) : null}
    </AccountDataState>
  );
}
