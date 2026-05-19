'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import { formatDateTime, formatRecordValue } from '@/lib/acadia/record-display';
import { useAcadiaNotifications } from '@/hooks/use-acadia-notifications';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';

export function NotificationInboxPanel() {
  const { data = [], isLoading, isError, error } = useAcadiaNotifications(50);
  const { markNotificationRead, markAllNotificationsRead } =
    useCommunicationMutations();

  const unreadCount = data.filter((item) => !item.readAt).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          Alerts & notifications
          {unreadCount > 0 ? (
            <Badge variant="warning" appearance="light">
              {unreadCount} unread
            </Badge>
          ) : null}
        </CardTitle>
        {unreadCount > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAllNotificationsRead.mutate()}
            disabled={markAllNotificationsRead.isPending}
          >
            Mark all read
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <AccountDataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={data.length === 0}
          emptyMessage="No in-app notifications yet."
        >
          <div className="flex flex-col gap-4">
            {data.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border p-4 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.titleEn}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRecordValue(item.event)} ·{' '}
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  {item.readAt ? (
                    <Badge variant="secondary" appearance="light">
                      Read
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markNotificationRead.mutate(item.id)}
                      disabled={markNotificationRead.isPending}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
                {item.bodyEn ? (
                  <p className="text-sm text-muted-foreground">{item.bodyEn}</p>
                ) : null}
              </div>
            ))}
          </div>
        </AccountDataState>
      </CardContent>
    </Card>
  );
}
