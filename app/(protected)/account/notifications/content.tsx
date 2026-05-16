'use client';

import {
  AcadiaNotificationPreferencesCard,
  AcadiaRecentNotificationsCard,
} from '@/components/acadia/account/acadia-notification-cards';

export function AccountNotificationsContent() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
      <AcadiaNotificationPreferencesCard />
      <AcadiaRecentNotificationsCard />
    </div>
  );
}
