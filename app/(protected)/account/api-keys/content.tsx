'use client';

import { TenantApiKeysList } from '@/components/acadia/account/tenant-api-keys-list';

export function AccountApiKeysContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Create keys for trusted integrations. The full secret is shown once at
        creation; only the prefix is stored for later display.
      </p>
      <TenantApiKeysList />
    </div>
  );
}
