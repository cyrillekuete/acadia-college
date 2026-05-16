'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'enrolledOn', header: 'Enrolled on' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Student enrollments" description="Active enrollments.">
      <SupabaseTableList
        table="StudentEnrollment"
        title="StudentEnrollment"
        select="id, status, enrolledOn"
        columns={columns}
        searchKeys={['status']}
      />
    </AcadiaPageShell>
  );
}
