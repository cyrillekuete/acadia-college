'use client';

import { CardNotification } from '@/partials/cards';
import {
  Bell,
  CalendarClock,
  ClipboardCheck,
  DollarSign,
  FileText,
  MessageCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
  'alert.sent': Bell,
};

const OtherNotifications = () => {
  const { t } = useTranslation();
  const locale = getUiLocale();
  const { preferences, pending, isLoading, setEventInApp } =
    useNotificationPreferenceToggles();

  const disabled = pending || isLoading;

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>{t('account.otherNotifications')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('account.inAppEventsHint', {
            defaultValue:
              'These switches control in-app alerts only. Email follows the master switch above.',
          })}
        </p>
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
