'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { useAcadiaNotificationPreferences } from '@/hooks/use-acadia-notification-preferences';
import { useAcadiaNotifications } from '@/hooks/use-acadia-notifications';
import {
  formatDateTime,
  formatRecordValue,
} from '@/lib/acadia/record-display';

export function AcadiaNotificationPreferencesCard() {
  const { data = [], isLoading, isError, error } =
    useAcadiaNotificationPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <AccountDataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={data.length === 0}
          emptyMessage="No notification preferences configured yet for your account."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>In-app</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.event}</TableCell>
                  <TableCell>{formatRecordValue(row.inApp)}</TableCell>
                  <TableCell>{formatRecordValue(row.email)}</TableCell>
                  <TableCell>{formatDateTime(row.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AccountDataState>
      </CardContent>
    </Card>
  );
}

export function AcadiaRecentNotificationsCard() {
  const { data = [], isLoading, isError, error } = useAcadiaNotifications();

  return (
    <AccountDataState
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={data.length === 0}
      emptyMessage="No in-app notifications yet."
    >
      <div className="flex flex-col gap-5">
        {data.map((item) => (
          <RecordDetailCard
            key={item.id}
            title={item.titleEn}
            fields={[
              { label: 'Event', value: formatRecordValue(item.event) },
              { label: 'Title (FR)', value: formatRecordValue(item.titleFr) },
              { label: 'Body (EN)', value: formatRecordValue(item.bodyEn) },
              {
                label: 'Read',
                value: item.readAt ? (
                  <Badge variant="secondary" appearance="light">
                    Read
                  </Badge>
                ) : (
                  <Badge variant="warning" appearance="light">
                    Unread
                  </Badge>
                ),
              },
              { label: 'Received', value: formatDateTime(item.createdAt) },
            ]}
          />
        ))}
      </div>
    </AccountDataState>
  );
}
