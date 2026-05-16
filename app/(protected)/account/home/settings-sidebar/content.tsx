'use client';

import { AcadiaUserProfileCards } from '@/components/acadia/account/acadia-user-profile-cards';
import { TenantSystemSettingsCards } from '@/components/acadia/account/tenant-system-settings-cards';

export function AccountSettingsSidebarContent() {
  return (
    <div className="flex flex-col gap-5 lg:gap-7.5">
      <AcadiaUserProfileCards />
      <TenantSystemSettingsCards />
    </div>
  );
}
