'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { Channels, DoNotDistrub, OtherNotifications } from './components';

export function AccountNotificationsContent() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-7.5">
      <div className="col-span-2">
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <Channels />
          <OtherNotifications />
          <Card>
            <CardHeader>
              <CardTitle>
                {t('account.whatsappChannel', { defaultValue: 'WhatsApp' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('account.whatsappChannelNote', {
                  defaultValue:
                    'WhatsApp alerts follow the school alert channel and the phone number on the student or guardian record. They are not toggled on this page.',
                })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="col-span-1">
        <DoNotDistrub />
      </div>
    </div>
  );
}
