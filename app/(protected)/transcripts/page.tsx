'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'issuedAt', header: 'Issued' },
  { accessorKey: 'language', header: 'Language' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Transcripts" description="Issued transcripts.">
      <SupabaseTableList
        table="Transcript"
        title="Transcript"
        select="id, issuedAt, language"
        columns={columns}
        searchKeys={[]}
      />
    </AcadiaPageShell>
  );
}
