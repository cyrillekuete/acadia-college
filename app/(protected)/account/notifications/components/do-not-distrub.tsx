'use client';

import { ReactNode } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { useNotificationPreferenceToggles } from '@/app/(protected)/account/notifications/use-notification-preference-toggles';

interface IDoNotDistrubProps {
  title?: string;
  icon?: ReactNode;
  text?: string;
}

const DoNotDistrub = ({ title, icon, text }: IDoNotDistrubProps) => {
  const { t } = useTranslation();
  const { isPaused, pending, isLoading, setAllInApp } =
    useNotificationPreferenceToggles();
  const isInteractive = !title && !text;
  const disabled = isInteractive && (pending || isLoading);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || t('account.doNotDisturb')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        <p className="text-sm text-secondary-foreground">
          {t('account.doNotDisturbBody')}
        </p>
      </CardContent>
      <CardFooter className="justify-center">
        <Button
          variant="outline"
          disabled={disabled}
          onClick={
            isInteractive
              ? () => {
                  void setAllInApp(isPaused);
                }
              : undefined
          }
        >
          <span className="flex items-center gap-1.5">
            {icon || <Bell size={16} />}
            {text ||
              (isPaused
                ? t('account.resumeNotifications')
                : t('account.pauseNotifications'))}
          </span>
        </Button>
      </CardFooter>
    </Card>
  );
};

export { DoNotDistrub, type IDoNotDistrubProps };
