'use client';

import { TenantInstitutionCards } from '@/components/acadia/account/tenant-institution-cards';

export function AccountCompanyProfileContent() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:gap-7.5">
      <TenantInstitutionCards />
    </div>
  );
}
