'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AnnouncementForm } from '@/components/acadia/communication/announcement-form';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewAnnouncementPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('communication.newAnnouncement')}
      description="Broadcast a school notice or schedule it for later."
    >
      <AnnouncementForm onCancelHref="/announcements" />
    </AcadiaPageShell>
  );
}
