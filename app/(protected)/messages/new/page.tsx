'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { MessageComposeForm } from '@/components/acadia/communication/message-compose-form';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewMessagePage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('communication.newMessage')}
      description="Start a direct conversation with another user."
    >
      <MessageComposeForm onCancelHref="/messages" />
    </AcadiaPageShell>
  );
}
