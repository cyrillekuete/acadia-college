'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AnnouncementsPanel } from '@/components/acadia/communication/announcements-panel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canManageAnnouncements } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canManageAnnouncements(session?.roleSlug);

  return (
    <AcadiaPageShell
      title={t('communication.announcementsTitle')}
      description={t('communication.announcementsDescription')}
    >
      {canManage ? (
        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <Button size="sm" asChild>
            <Link href="/announcements/new">{t('communication.newAnnouncement')}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/announcements/events">{t('communication.eventsTitle')}</Link>
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="all" className="print:hidden">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <AnnouncementsPanel canManage={canManage} />
        </TabsContent>
        <TabsContent value="published" className="mt-4">
          <AnnouncementsPanel canManage={canManage} publishedOnly />
        </TabsContent>
      </Tabs>
    </AcadiaPageShell>
  );
}
