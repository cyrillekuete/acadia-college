'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';
import {
  useAcadiaNotifications,
  type AcadiaNotificationRow,
} from '@/hooks/use-acadia-notifications';
import { useTranslation } from '@/hooks/useTranslation';
import { NotificationItem } from './notifications/notification-item';

const ANNOUNCEMENT_EVENTS = new Set([
  'announcement.broadcast',
  'announcement.event',
  'alert.sent',
]);

function filterNotifications(
  items: AcadiaNotificationRow[],
  tab: 'all' | 'inbox' | 'team' | 'following',
): AcadiaNotificationRow[] {
  if (tab === 'inbox') {
    return items.filter((item) => !item.readAt);
  }
  if (tab === 'team') {
    return items.filter((item) => ANNOUNCEMENT_EVENTS.has(item.event));
  }
  if (tab === 'following') {
    return items.filter((item) => item.event === 'message.received');
  }
  return items;
}

function NotificationList({
  items,
  emptyMessage,
  isLoading,
  isError,
  error,
  onOpen,
}: {
  items: AcadiaNotificationRow[];
  emptyMessage: string;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onOpen: (item: AcadiaNotificationRow, href: string) => void;
}) {
  return (
    <AccountDataState
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={items.length === 0}
      emptyMessage={emptyMessage}
    >
      <div className="flex flex-col gap-5">
        {items.map((item, index) => (
          <div key={item.id}>
            {index > 0 ? <div className="border-b border-b-border mb-5" /> : null}
            <NotificationItem item={item} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </AccountDataState>
  );
}

export function NotificationsSheet({ trigger }: { trigger: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data = [], isLoading, isError, error } = useAcadiaNotifications(50);
  const { markNotificationRead, markAllNotificationsRead } =
    useCommunicationMutations();
  const unreadCount = data.filter((item) => !item.readAt).length;

  const openNotification = (item: AcadiaNotificationRow, href: string) => {
    if (!item.readAt) {
      markNotificationRead.mutate(item.id);
    }
    router.push(href);
  };

  return (
    <div className="relative">
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
          <SheetHeader className="mb-0">
            <SheetTitle className="p-3">{t('communication.sheetTitle')}</SheetTitle>
          </SheetHeader>
          <SheetBody className="p-0">
            <ScrollArea className="h-[calc(100vh-10.5rem)]">
              <Tabs defaultValue="all" className="w-full relative">
                <TabsList variant="line" className="w-full px-5 mb-5">
                  <TabsTrigger value="all">{t('communication.tabAll')}</TabsTrigger>
                  <TabsTrigger value="inbox" className="relative">
                    {t('communication.tabInbox')}
                    {unreadCount > 0 ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 absolute top-1 -end-1" />
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="team">{t('communication.tabTeam')}</TabsTrigger>
                  <TabsTrigger value="following">
                    {t('communication.tabFollowing')}
                  </TabsTrigger>
                  <div className="grow flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      mode="icon"
                      className="mb-1"
                      asChild
                    >
                      <Link href="/account/notifications" aria-label={t('account.notifications')}>
                        <Settings className="size-4.5!" />
                      </Link>
                    </Button>
                  </div>
                </TabsList>

                <TabsContent value="all" className="mt-0">
                  <NotificationList
                    items={filterNotifications(data, 'all')}
                    emptyMessage={t('communication.noNotifications')}
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    onOpen={openNotification}
                  />
                </TabsContent>
                <TabsContent value="inbox" className="mt-0">
                  <NotificationList
                    items={filterNotifications(data, 'inbox')}
                    emptyMessage={t('communication.noUnreadNotifications')}
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    onOpen={openNotification}
                  />
                </TabsContent>
                <TabsContent value="team" className="mt-0">
                  <NotificationList
                    items={filterNotifications(data, 'team')}
                    emptyMessage={t('communication.noAnnouncementNotifications')}
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    onOpen={openNotification}
                  />
                </TabsContent>
                <TabsContent value="following" className="mt-0">
                  <NotificationList
                    items={filterNotifications(data, 'following')}
                    emptyMessage={t('communication.noMessageNotifications')}
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    onOpen={openNotification}
                  />
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </SheetBody>
          <SheetFooter className="border-t border-border p-5">
            <Button
              variant="outline"
              className="w-full"
              disabled={unreadCount === 0 || markAllNotificationsRead.isPending}
              onClick={() => markAllNotificationsRead.mutate()}
            >
              {t('communication.markAllRead')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {unreadCount > 0 ? (
        <span className="absolute top-0 end-0 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] font-semibold text-white pointer-events-none">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </div>
  );
}
