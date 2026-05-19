'use client';

import { use } from 'react';
import { MessageThreadPanel } from '@/components/acadia/communication/message-thread-panel';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';

export default function MessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <RecordDetailShell
      title="Conversation"
      description="Read messages and reply in this thread."
      backHref="/messages"
      backLabel="Back to messages"
      isLoading={false}
      isError={false}
      error={null}
    >
      <MessageThreadPanel threadId={id} />
    </RecordDetailShell>
  );
}
