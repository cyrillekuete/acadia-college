'use client';

import { TenantApiKeysList } from '@/components/acadia/account/tenant-api-keys-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AccountApiKeysContent() {
  return (
    <div className="flex flex-col gap-5 lg:gap-7.5">
      <Card>
        <CardHeader>
          <CardTitle>API access</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          API keys allow programmatic access to Acadia College data for your
          tenant. Only key prefixes are shown here; full secrets are never
          returned after creation.
        </CardContent>
      </Card>
      <TenantApiKeysList />
    </div>
  );
}
