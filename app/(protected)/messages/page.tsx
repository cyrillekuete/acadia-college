'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { threadSubjectDisplay } from '@/lib/acadia/communication';
import { MESSAGE_INBOX_LIMIT, threadIsUnread } from '@/lib/acadia/messages';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canComposeMessages, canManageMessageGroups } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

type MemberReadState = { userId?: string; lastReadAt?: string | null };

type MessageThreadRow = {
  id: string;
  kind: string;
  subjectEn?: string | null;
  subjectFr?: string | null;
  createdAt: string;
  updatedAt: string;
  MessageThreadMember?: MemberReadState[] | MemberReadState | null;
} & Record<string, unknown>;

function membershipRows(row: MessageThreadRow): MemberReadState[] {
  const members = row.MessageThreadMember;
  if (!members) {
    return [];
  }
  return Array.isArray(members) ? members : [members];
}

export default function MessagesPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canMessage = canComposeMessages(session?.roleSlug);
  const canGroups = canManageMessageGroups(session?.roleSlug);
  const currentUserId = session?.profile?.id;

  const columns = useMemo<ColumnDef<MessageThreadRow>[]>(
    () => [
      {
        accessorKey: 'subjectEn',
        header: 'Subject',
        cell: ({ row }) => {
          const mine = membershipRows(row.original).find(
            (member) => member.userId === currentUserId,
          );
          const unread = Boolean(
            mine && threadIsUnread(mine.lastReadAt, row.original.updatedAt),
          );
          return (
            <Link
              href={`/messages/${row.original.id}`}
              className={cn(
                'text-primary hover:underline',
                unread ? 'font-semibold' : 'font-medium',
              )}
            >
              {threadSubjectDisplay(row.original)}
              {unread ? (
                <Badge variant="secondary" className="ms-2 align-middle">
                  {t('communication.unread')}
                </Badge>
              ) : null}
            </Link>
          );
        },
      },
      {
        id: 'kind',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.kind === 'GROUP' ? 'Group' : 'Direct'}
          </Badge>
        ),
      },
      { accessorKey: 'updatedAt', header: 'Last activity' },
    ],
    [currentUserId, t],
  );

  return (
    <AcadiaPageShell
      title={t('communication.messagesTitle')}
      description={t('communication.messagesDescription')}
    >
      {canMessage ? (
        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <Button size="sm" asChild>
            <Link href="/messages/new">{t('communication.newMessage')}</Link>
          </Button>
          {canGroups ? (
            <Button size="sm" variant="outline" asChild>
              <Link href="/messages/groups">{t('communication.groupsTitle')}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {canGroups ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {t('communication.oversightHint')}
        </p>
      ) : null}

      <SupabaseTableList
        table="MessageThread"
        title={t('communication.conversations')}
        select="id, kind, subjectEn, subjectFr, createdAt, updatedAt, MessageThreadMember(userId, lastReadAt)"
        columns={columns}
        searchKeys={['subjectEn', 'subjectFr']}
        order={{ column: 'updatedAt', ascending: false }}
        limit={MESSAGE_INBOX_LIMIT}
        truncatedLabel={t('communication.inboxTruncated')}
        emptyMessage={t('communication.emptyInbox')}
      />
    </AcadiaPageShell>
  );
}
