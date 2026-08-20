'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantLogo } from '@/components/acadia/tenant-logo';
import { TenantLogoUpload } from '@/components/acadia/account/tenant-logo-upload';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import { useAcadiaTenant } from '@/hooks/use-acadia-tenant';
import { getTenantAssetPublicUrl } from '@/lib/supabase/storage';
import { GraduationCap } from '@/lib/icons';

export function TenantLogoPreview() {
  const { data: tenant, isLoading, isError, error } = useAcadiaTenant();
  const logoUrl = getTenantAssetPublicUrl(tenant?.logoStorageKey);
  const reportCardLogoUrl = getTenantAssetPublicUrl(tenant?.reportCardLogoStorageKey);

  return (
    <Card className="h-full">
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
          <TenantLogoUpload kind="institution" />
          <p className="text-sm text-muted-foreground">
            {logoUrl
              ? 'Logo loaded from school branding storage.'
              : 'No logo uploaded yet — default Acadia branding is shown until you upload one.'}
          </p>
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <p className="text-sm font-medium">Report card logo</p>
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              {reportCardLogoUrl ? (
                <img
                  src={reportCardLogoUrl}
                  alt="Report card logo"
                  className="h-24 w-24 object-contain"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
                  <GraduationCap className="size-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <TenantLogoUpload kind="reportCard" />
            <p className="text-sm text-muted-foreground">
              {reportCardLogoUrl
                ? 'Report card logo loaded from school branding storage.'
                : 'No report card logo uploaded yet — report cards will use the institution logo until you upload one.'}
            </p>
          </div>
        </AccountDataState>
      </CardContent>
    </Card>
  );
}
