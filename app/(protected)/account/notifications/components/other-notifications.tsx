'use client';

import { CardNotification } from '@/partials/cards';
import {
  CalendarClock,
  ClipboardCheck,
  DollarSign,
  FileText,
  MessageCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  NOTIFICATION_EVENTS,
  notificationEventLabel,
  preferenceForEvent,
  type NotificationEvent,
} from '@/lib/acadia/communication';
import { getUiLocale } from '@/lib/acadia/locale';
import { useTranslation } from '@/hooks/useTranslation';
import { useNotificationPreferenceToggles } from '@/app/(protected)/account/notifications/use-notification-preference-toggles';

const EVENT_ICONS: Record<NotificationEvent, LucideIcon> = {
  'attendance.absence': ClipboardCheck,
  'announcement.broadcast': FileText,
  'announcement.event': CalendarClock,
  'message.received': MessageCircle,
  'marks.published': Users,
  'fees.overdue': DollarSign,
};

const OtherNotifications = () => {
  const { t } = useTranslation();
  const locale = getUiLocale();
  const {
    preferences,
    allInAppEnabled,
    pending,
    isLoading,
    setEventInApp,
    setAllInApp,
  } = useNotificationPreferenceToggles();

  const disabled = pending || isLoading;

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>{t('account.otherNotifications')}</CardTitle>
        <div className="flex items-center gap-2">
          <Label htmlFor="notification-enable-all-events" className="text-sm">
            {t('account.enableAllEvents')}
          </Label>
          <Switch
            id="notification-enable-all-events"
            size="sm"
            checked={allInAppEnabled}
            disabled={disabled}
            onCheckedChange={(checked) => {
              void setAllInApp(checked);
            }}
          />
        </div>
      </CardHeader>
      <div id="notifications_cards">
        {NOTIFICATION_EVENTS.map((event) => {
          const Icon = EVENT_ICONS[event];
          const current = preferenceForEvent(preferences, event);
          return (
            <CardNotification
              key={event}
              icon={Icon}
              title={t(`communication.eventLabels.${event}`, {
                defaultValue: notificationEventLabel(event, locale),
              })}
              description={t(`communication.eventDescriptions.${event}`)}
              actions={
                <Switch
                  id={`notification-event-${event}`}
                  size="sm"
                  checked={current.inApp}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    void setEventInApp(event, checked);
                  }}
                />
              }
            />
          );
        })}
      </div>
    </Card>
  );
};

export { OtherNotifications };
