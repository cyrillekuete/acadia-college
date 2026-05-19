'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { MessageComposeForm } from '@/components/acadia/communication/message-compose-form';

export default function NewMessagePage() {
  return (
    <AcadiaPageShell
      title="New message"
      description="Start a direct conversation with another user."
    >
      <MessageComposeForm onCancelHref="/messages" />
    </AcadiaPageShell>
  );
}
