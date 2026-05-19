'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { threadSubjectDisplay } from '@/lib/acadia/communication';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canComposeMessages } from '@/lib/acadia/roles';

type MessageThreadRow = {
  id: string;
  kind: string;
  subjectEn?: string | null;
  subjectFr?: string | null;
  createdAt: string;
  updatedAt: string;
} & Record<string, unknown>;

const columns: ColumnDef<MessageThreadRow>[] = [
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
    id: 'kind',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.kind === 'GROUP' ? 'Group' : 'Direct'}
      </Badge>
    ),
  },
  { accessorKey: 'updatedAt', header: 'Last activity' },
];

export default function MessagesPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canMessage = canComposeMessages(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="Messages"
      description="Direct and group conversations between school users."
    >
      {canMessage ? (
        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <Button size="sm" asChild>
            <Link href="/messages/new">New message</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/messages/groups">Group conversations</Link>
          </Button>
        </div>
      ) : null}

      <SupabaseTableList
        table="MessageThread"
        title="Conversations"
        select="id, kind, subjectEn, subjectFr, createdAt, updatedAt"
        columns={columns}
        searchKeys={['subjectEn', 'subjectFr']}
      />
    </AcadiaPageShell>
  );
}
