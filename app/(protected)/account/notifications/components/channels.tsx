'use client';

import { ReactNode } from 'react';
import { CardNotification } from '@/partials/cards';
import { LucideIcon, Mail } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { useNotificationPreferenceToggles } from '@/app/(protected)/account/notifications/use-notification-preference-toggles';

interface IChannelsItem {
  icon: LucideIcon;
  title: string;
  description: string;
  button?: boolean;
  actions: ReactNode;
}
type IChannelsItems = Array<IChannelsItem>;

const Channels = () => {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const { emailEnabled, pending, isLoading, setAllEmail } =
    useNotificationPreferenceToggles();

  const disabled = pending || isLoading;
  const email = session?.profile?.email ?? t('account.emailChannelFallback');

  const items: IChannelsItems = [
    {
      icon: Mail,
      title: t('account.emailChannel'),
      description: `${email}. ${t('account.emailChannelMasterHint', {
        defaultValue:
          'This switch turns email on or off for every event. You cannot mute a single event’s email.',
      })}`,
      button: true,
      actions: (
        <Switch
          id="notification-channel-email"
          size="sm"
          checked={emailEnabled}
          disabled={disabled}
          onCheckedChange={(checked) => {
            void setAllEmail(checked);
          }}
        />
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>{t('account.channelsTitle')}</CardTitle>
      </CardHeader>
      <div id="notifications_cards">
        {items.map((item, index) => (
          <CardNotification
            icon={item.icon}
            title={item.title}
            description={item.description}
            button={item.button}
            actions={item.actions}
            key={index}
          />
        ))}
      </div>
    </Card>
  );
};

export { Channels, type IChannelsItem, type IChannelsItems };
