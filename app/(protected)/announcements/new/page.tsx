'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AnnouncementForm } from '@/components/acadia/communication/announcement-form';

export default function NewAnnouncementPage() {
  return (
    <AcadiaPageShell
      title="New announcement"
      description="Broadcast a school notice or schedule it for later."
    >
      <AnnouncementForm onCancelHref="/announcements" />
    </AcadiaPageShell>
  );
}
