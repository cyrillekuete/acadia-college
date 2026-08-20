import type { ReactNode } from 'react';
import { TenantApiKeysAccessGate } from '@/components/acadia/account/tenant-api-keys-access-gate';

export default function AccountApiKeysLayout({ children }: { children: ReactNode }) {
  return <TenantApiKeysAccessGate>{children}</TenantApiKeysAccessGate>;
}
