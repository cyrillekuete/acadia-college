'use client';

import { NotificationInboxPanel } from '@/components/acadia/communication/notification-inbox-panel';
import { NotificationPreferencesForm } from '@/components/acadia/communication/notification-preferences-form';

export function AccountNotificationsContent() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
      <NotificationInboxPanel />
      <NotificationPreferencesForm />
    </div>
  );
}
