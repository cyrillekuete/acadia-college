'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'subject', header: 'Subject' },
  { accessorKey: 'createdAt', header: 'Created' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Messages" description="Message threads.">
      <SupabaseTableList
        table="MessageThread"
        title="MessageThread"
        select="id, subject, createdAt"
        columns={columns}
        searchKeys={['subject']}
      />
    </AcadiaPageShell>
  );
}
