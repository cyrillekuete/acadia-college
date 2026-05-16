'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'requestedAt', header: 'Requested' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Transcript requests" description="Copy requests.">
      <SupabaseTableList
        table="TranscriptCopyRequest"
        title="TranscriptCopyRequest"
        select="id, status, requestedAt"
        columns={columns}
        searchKeys={['status']}
      />
    </AcadiaPageShell>
  );
}
