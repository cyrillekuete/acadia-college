'use client';

import { use } from 'react';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { AnnouncementForm } from '@/components/acadia/communication/announcement-form';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canManageAnnouncements } from '@/lib/acadia/roles';
import {
  announcementAudienceLabel,
  announcementStatusLabel,
  resolveAnnouncementLifecycleStatus,
} from '@/lib/acadia/communication';
import { isoToLocalDateTimeInputValue } from '@/lib/acadia/dates';
import { formatDateTime, formatRecordValue } from '@/lib/acadia/record-display';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AnnouncementDetail = {
  id: string;
  kind: string;
  titleEn: string;
  titleFr: string;
  bodyEn: string | null;
  bodyFr: string | null;
  audience: string;
  status: string;
  eventStartsAt: string | null;
  eventEndsAt: string | null;
  eventLocation: string | null;
  publishAt: string | null;
  createdAt: string;
};

export default function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canManageAnnouncements(session?.roleSlug);
  const { data, isLoading, isError, error } = useSupabaseRecord<AnnouncementDetail>(
    'SchoolAnnouncement',
    id,
    'id, kind, titleEn, titleFr, bodyEn, bodyFr, audience, status, eventStartsAt, eventEndsAt, eventLocation, publishAt, publishedAt, createdAt',
  );

  const effectiveStatus = data
    ? resolveAnnouncementLifecycleStatus(data)
    : null;

  return (
    <RecordDetailShell
      title={data?.titleEn ?? 'Announcement'}
      description="Announcement details and scheduling."
      backHref="/announcements"
      backLabel="Back to announcements"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <Tabs defaultValue="view" className="space-y-4">
          <TabsList className="print:hidden">
            <TabsTrigger value="view">Details</TabsTrigger>
            {canManage ? <TabsTrigger value="edit">Edit</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="view">
            <RecordDetailCard
              title={data.titleEn}
              fields={[
                {
                  label: 'Status',
                  value: effectiveStatus
                    ? announcementStatusLabel(effectiveStatus)
                    : '—',
                },
                {
                  label: 'Type',
                  value: data.kind === 'EVENT' ? 'Event' : 'Broadcast',
                },
                {
                  label: 'Audience',
                  value: announcementAudienceLabel(data.audience),
                },
                { label: 'Title (FR)', value: data.titleFr },
                { label: 'Body (EN)', value: formatRecordValue(data.bodyEn) },
                { label: 'Body (FR)', value: formatRecordValue(data.bodyFr) },
                {
                  label: 'Scheduled publish',
                  value: data.publishAt ? formatDateTime(data.publishAt) : '—',
                },
                {
                  label: 'Event start',
                  value: data.eventStartsAt
                    ? formatDateTime(data.eventStartsAt)
                    : '—',
                },
                {
                  label: 'Location',
                  value: formatRecordValue(data.eventLocation),
                },
                { label: 'Created', value: formatDateTime(data.createdAt) },
              ]}
            />
          </TabsContent>

          {canManage ? (
            <TabsContent value="edit">
              <AnnouncementForm
                announcementId={data.id}
                onCancelHref={`/announcements/${data.id}`}
                defaultValues={{
                  kind: data.kind as 'BROADCAST' | 'EVENT',
                  titleEn: data.titleEn,
                  titleFr: data.titleFr,
                  bodyEn: data.bodyEn ?? '',
                  bodyFr: data.bodyFr ?? '',
                  audience: data.audience as 'ALL' | 'STAFF' | 'STUDENTS' | 'GUARDIANS',
                  eventStartsAt: isoToLocalDateTimeInputValue(data.eventStartsAt),
                  eventEndsAt: isoToLocalDateTimeInputValue(data.eventEndsAt),
                  eventLocation: data.eventLocation ?? '',
                  publishAt: isoToLocalDateTimeInputValue(data.publishAt),
                  publishNow: data.status === 'PUBLISHED',
                }}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      ) : null}
    </RecordDetailShell>
  );
}
