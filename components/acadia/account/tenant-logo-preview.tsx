'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantLogo } from '@/components/acadia/tenant-logo';
import { TenantLogoUpload } from '@/components/acadia/account/tenant-logo-upload';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import { useAcadiaTenant } from '@/hooks/use-acadia-tenant';
import { getTenantAssetPublicUrl } from '@/lib/supabase/storage';
import { formatRecordValue } from '@/lib/acadia/record-display';

export function TenantLogoPreview() {
  const { data: tenant, isLoading, isError, error } = useAcadiaTenant();
  const logoUrl = getTenantAssetPublicUrl(tenant?.logoStorageKey);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Institution logo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AccountDataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!tenant}
        >
          <div className="flex items-center gap-4 rounded-lg border border-border p-4">
            <TenantLogo variant="default" />
          </div>
          <TenantLogoUpload />
          <p className="text-sm text-muted-foreground">
            {logoUrl
              ? 'Logo loaded from Supabase Storage (tenant-assets bucket).'
              : 'No logo uploaded yet — default Acadia branding is shown until you upload one.'}
          </p>
          <p className="text-xs text-muted-foreground">
            Storage key: {formatRecordValue(tenant?.logoStorageKey)}
          </p>
        </AccountDataState>
      </CardContent>
    </Card>
  );
}
