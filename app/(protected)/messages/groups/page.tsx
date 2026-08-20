'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { MessageGroupForm } from '@/components/acadia/communication/message-group-form';
import { Button } from '@/components/ui/button';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { threadSubjectDisplay, messageGroupScopeLabel } from '@/lib/acadia/communication';
import { MESSAGE_INBOX_LIMIT } from '@/lib/acadia/messages';
import { canManageMessageGroups } from '@/lib/acadia/roles';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';

type GroupThreadRow = {
  id: string;
  subjectEn?: string | null;
  subjectFr?: string | null;
  groupScope?: string | null;
  groupScopeId?: string | null;
  updatedAt: string;
} & Record<string, unknown>;

const columns: ColumnDef<GroupThreadRow>[] = [
  {
    accessorKey: 'subjectEn',
    header: 'Subject',
    cell: ({ row }) => (
      <Link
        href={`/messages/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {threadSubjectDisplay(row.original)}
      </Link>
    ),
  },
  {
    id: 'scope',
    header: 'Scope',
    cell: ({ row }) =>
      row.original.groupScope ? (
        <Badge variant="outline">
          {messageGroupScopeLabel(String(row.original.groupScope))}
        </Badge>
      ) : (
        '—'
      ),
  },
  { accessorKey: 'updatedAt', header: 'Last activity' },
];

export default function MessageGroupsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session, isLoading } = useAcadiaCollegeSession();
  const canManage = canManageMessageGroups(session?.roleSlug);

  useEffect(() => {
    if (!isLoading && !canManage) {
      router.replace('/messages');
    }
  }, [isLoading, canManage, router]);

  if (isLoading || !canManage) {
    return null;
  }

  return (
    <AcadiaPageShell
      title={t('communication.groupsTitle')}
      description="Create department, stream, or level group conversations."
    >
      <div className="mb-6">
        <Button size="sm" variant="outline" asChild>
          <Link href="/messages">All messages</Link>
        </Button>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-4">Create group</h2>
          <MessageGroupForm onCancelHref="/messages/groups" />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Existing groups</h2>
          <SupabaseTableList
            table="MessageThread"
            title={t('communication.groupThreads')}
            select="id, kind, subjectEn, subjectFr, groupScope, groupScopeId, updatedAt"
            columns={columns}
            searchKeys={['subjectEn', 'subjectFr']}
            filters={[{ column: 'kind', value: 'GROUP' }]}
            order={{ column: 'updatedAt', ascending: false }}
            limit={MESSAGE_INBOX_LIMIT}
            truncatedLabel={t('communication.inboxTruncated')}
            emptyMessage={t('communication.emptyGroups')}
          />
        </div>
      </div>
    </AcadiaPageShell>
  );
}
