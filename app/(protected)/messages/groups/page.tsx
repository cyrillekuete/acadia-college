'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { MessageGroupForm } from '@/components/acadia/communication/message-group-form';
import { Button } from '@/components/ui/button';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { threadSubjectDisplay, messageGroupScopeLabel } from '@/lib/acadia/communication';
import { useTranslation } from '@/hooks/useTranslation';

type GroupThreadRow = {
  id: string;
  subjectEn?: string | null;
  subjectFr?: string | null;
  groupScope?: string | null;
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
            select="id, kind, subjectEn, subjectFr, groupScope, updatedAt"
            columns={columns}
            searchKeys={['subjectEn']}
            rowFilter={(row) => row.kind === 'GROUP'}
          />
        </div>
      </div>
    </AcadiaPageShell>
  );
}
