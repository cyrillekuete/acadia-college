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
import { localizedText } from '@/lib/acadia/locale';
import { useTranslation } from '@/hooks/useTranslation';

export function AcadiaNotificationPreferencesCard() {
  const { t } = useTranslation();
  const { data = [], isLoading, isError, error } =
    useAcadiaNotificationPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('account.notificationPreferences')}</CardTitle>
      </CardHeader>
      <CardContent>
        <AccountDataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={data.length === 0}
          emptyMessage={t('account.noPreferences')}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('communication.event')}</TableHead>
                <TableHead>{t('communication.inApp')}</TableHead>
                <TableHead>{t('common.labels.email')}</TableHead>
                <TableHead>{t('communication.updated')}</TableHead>
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
  const { t } = useTranslation();
  const { data = [], isLoading, isError, error } = useAcadiaNotifications();

  return (
    <AccountDataState
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={data.length === 0}
      emptyMessage={t('communication.noNotifications')}
    >
      <div className="flex flex-col gap-5">
        {data.map((item) => (
          <RecordDetailCard
            key={item.id}
            title={localizedText(item.titleEn, item.titleFr)}
            fields={[
              { label: t('communication.event'), value: formatRecordValue(item.event) },
              {
                label: t('common.labels.description'),
                value: formatRecordValue(localizedText(item.bodyEn, item.bodyFr)),
              },
              {
                label: t('communication.read'),
                value: item.readAt ? (
                  <Badge variant="secondary" appearance="light">
                    {t('communication.read')}
                  </Badge>
                ) : (
                  <Badge variant="warning" appearance="light">
                    {t('communication.unread')}
                  </Badge>
                ),
              },
              { label: t('communication.received'), value: formatDateTime(item.createdAt) },
            ]}
          />
        ))}
      </div>
    </AccountDataState>
  );
}
