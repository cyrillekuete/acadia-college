'use client';

import { ReactNode } from 'react';
import { CardNotification } from '@/partials/cards';
import { LucideIcon, Mail, Monitor, Phone, Slack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
  const {
    emailEnabled,
    inAppEnabled,
    allChannelsEnabled,
    pending,
    isLoading,
    setAllEmail,
    setAllInApp,
    setAllChannels,
  } = useNotificationPreferenceToggles();

  const disabled = pending || isLoading;
  const email = session?.profile?.email ?? t('account.emailChannelFallback');

  const items: IChannelsItems = [
    {
      icon: Mail,
      title: t('account.emailChannel'),
      description: email,
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
    {
      icon: Phone,
      title: t('account.mobileChannel'),
      description: t('account.mobileChannelDescription'),
      button: true,
      actions: (
        <Switch
          id="notification-channel-mobile"
          size="sm"
          checked={false}
          disabled
        />
      ),
    },
    {
      icon: Slack,
      title: t('account.slackChannel'),
      description: t('account.slackChannelDescription'),
      actions: (
        <Button variant="outline" disabled>
          {t('account.connectSlack')}
        </Button>
      ),
    },
    {
      icon: Monitor,
      title: t('account.inAppChannel'),
      description: t('account.inAppChannelDescription'),
      actions: (
        <Switch
          id="notification-channel-in-app"
          size="sm"
          checked={inAppEnabled}
          disabled={disabled}
          onCheckedChange={(checked) => {
            void setAllInApp(checked);
          }}
        />
      ),
    },
  ];

  const renderItem = (item: IChannelsItem, index: number) => {
    return (
      <CardNotification
        icon={item.icon}
        title={item.title}
        description={item.description}
        button={item.button}
        actions={item.actions}
        key={index}
      />
    );
  };

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>{t('account.channelsTitle')}</CardTitle>
        <div className="flex items-center gap-2">
          <Label htmlFor="notification-enable-all-channels" className="text-sm">
            {t('account.enableAllChannels')}
          </Label>
          <Switch
            id="notification-enable-all-channels"
            size="sm"
            checked={allChannelsEnabled}
            disabled={disabled}
            onCheckedChange={(checked) => {
              void setAllChannels(checked);
            }}
          />
        </div>
      </CardHeader>
      <div id="notifications_cards">
        {items.map((item, index) => {
          return renderItem(item, index);
        })}
      </div>
    </Card>
  );
};

export { Channels, type IChannelsItem, type IChannelsItems };
