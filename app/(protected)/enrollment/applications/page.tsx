'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'kind', header: 'Kind' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'submittedAt', header: 'Submitted' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Enrollment applications" description="Incoming applications.">
      <SupabaseTableList
        table="EnrollmentApplication"
        title="EnrollmentApplication"
        select="id, status, kind, submittedAt"
        columns={columns}
        searchKeys={['status', 'kind']}
      />
    </AcadiaPageShell>
  );
}
