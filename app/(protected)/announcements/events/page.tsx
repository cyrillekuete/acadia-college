'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AnnouncementsPanel } from '@/components/acadia/communication/announcements-panel';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canManageAnnouncements } from '@/lib/acadia/roles';

export default function AnnouncementEventsPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canManageAnnouncements(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="Event notifications"
      description="Upcoming school events and calendar announcements."
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/announcements">All announcements</Link>
        </Button>
        {canManage ? (
          <Button size="sm" asChild>
            <Link href="/announcements/new">New event</Link>
          </Button>
        ) : null}
      </div>

      <AnnouncementsPanel kindFilter="EVENT" canManage={canManage} />
    </AcadiaPageShell>
  );
}
