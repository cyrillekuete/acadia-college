'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'createdAt', header: 'When' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — System log" description="Audit log entries.">
      <SupabaseTableList
        table="SystemLog"
        title="SystemLog"
        select="id, action, createdAt"
        columns={columns}
        searchKeys={['action']}
      />
    </AcadiaPageShell>
  );
}
