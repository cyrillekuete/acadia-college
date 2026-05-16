'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { TenantLogoPreview } from '@/components/acadia/account/tenant-logo-preview';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import { useAcadiaTenant } from '@/hooks/use-acadia-tenant';
import {
  formatDateTime,
  formatRecordValue,
} from '@/lib/acadia/record-display';

export function TenantInstitutionCards() {
  const { data: tenant, isLoading, isError, error } = useAcadiaTenant();

  return (
    <AccountDataState
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={!tenant}
      emptyMessage="Institution record not found for your tenant."
    >
      {tenant ? (
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <TenantLogoPreview />
          <RecordDetailCard
            title="General info"
            fields={[
              { label: 'Name (EN)', value: formatRecordValue(tenant.displayNameEn) },
              { label: 'Name (FR)', value: formatRecordValue(tenant.displayNameFr) },
              { label: 'Slug', value: formatRecordValue(tenant.slug) },
              {
                label: 'Status',
                value: (
                  <Badge variant="success" appearance="light">
                    {tenant.status}
                  </Badge>
                ),
              },
              { label: 'Deployment', value: formatRecordValue(tenant.deploymentMode) },
              { label: 'Plan', value: formatRecordValue(tenant.planSlug) },
              { label: 'Tenant ID', value: formatRecordValue(tenant.id) },
            ]}
          />
          <RecordDetailCard
            title="Contact & address"
            fields={[
              { label: 'Institution email', value: formatRecordValue(tenant.institutionEmail) },
              { label: 'Institution phone', value: formatRecordValue(tenant.institutionPhone) },
              {
                label: 'Website',
                value: tenant.websiteUrl ? (
                  <Link
                    href={tenant.websiteUrl}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {tenant.websiteUrl}
                  </Link>
                ) : (
                  '—'
                ),
              },
              { label: 'Address line 1', value: formatRecordValue(tenant.addressLine1) },
              { label: 'Address line 2', value: formatRecordValue(tenant.addressLine2) },
              { label: 'City', value: formatRecordValue(tenant.city) },
              { label: 'Region', value: formatRecordValue(tenant.region) },
              { label: 'Country', value: formatRecordValue(tenant.country) },
              {
                label: 'Secondary contact',
                value: formatRecordValue(tenant.secondaryContactName),
              },
              {
                label: 'Secondary email',
                value: formatRecordValue(tenant.secondaryContactEmail),
              },
            ]}
          />
          <RecordDetailCard
            title="Branding"
            fields={[
              { label: 'Primary color', value: formatRecordValue(tenant.primaryColor) },
              { label: 'Accent color', value: formatRecordValue(tenant.accentColor) },
              { label: 'Logo storage key', value: formatRecordValue(tenant.logoStorageKey) },
              {
                label: 'PDF issuer (EN)',
                value: formatRecordValue(tenant.pdfIssuerDisplayNameEn),
              },
              {
                label: 'PDF issuer (FR)',
                value: formatRecordValue(tenant.pdfIssuerDisplayNameFr),
              },
              { label: 'Custom domain', value: formatRecordValue(tenant.customDomain) },
            ]}
          />
          <RecordDetailCard
            title="Record"
            fields={[
              { label: 'Created', value: formatDateTime(tenant.createdAt) },
              { label: 'Updated', value: formatDateTime(tenant.updatedAt) },
            ]}
          />
        </div>
      ) : null}
    </AccountDataState>
  );
}
