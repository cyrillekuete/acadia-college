'use client';

import { Fragment } from 'react';
import { Engage } from '@/partials/common/engage';
import { Faq } from '@/partials/common/faq';
import {
  HighlightedPosts,
  HighlightedPostsItems,
} from '@/partials/common/highlighted-posts';
import { BellDot, BellRing, MessageSquareText } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useTranslation } from '@/hooks/useTranslation';
import { Channels, DoNotDistrub, OtherNotifications } from './components';

export function AccountNotificationsContent() {
  const { t } = useTranslation();
  const posts: HighlightedPostsItems = [
    {
      icon: BellRing,
      title: t('account.highlightedAlertsTitle'),
      summary: t('account.highlightedAlertsSummary'),
      path: '/account/notifications',
    },
    {
      icon: MessageSquareText,
      title: t('account.highlightedMessagesTitle'),
      summary: t('account.highlightedMessagesSummary'),
      path: '/messages',
    },
    {
      icon: BellDot,
      title: t('account.highlightedAttendanceTitle'),
      summary: t('account.highlightedAttendanceSummary'),
      path: '/attendance',
    },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-7.5">
      <div className="col-span-2">
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <Channels />
          <OtherNotifications />
          <Faq />
          <Engage
            title={t('account.contactSupport')}
            description={t('account.contactSupportDescription')}
            image={
              <Fragment>
                <img
                  src={toAbsoluteUrl('/media/illustrations/31.svg')}
                  className="dark:hidden max-h-[150px]"
                  alt=""
                />
                <img
                  src={toAbsoluteUrl('/media/illustrations/31-dark.svg')}
                  className="light:hidden max-h-[150px]"
                  alt=""
                />
              </Fragment>
            }
            more={{
              title: t('account.contactSupport'),
              url: '/messages',
            }}
          />
        </div>
      </div>
      <div className="col-span-1">
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <DoNotDistrub />
          <HighlightedPosts posts={posts} />
        </div>
      </div>
    </div>
  );
}
