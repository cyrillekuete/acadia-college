'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'sessionDate', header: 'Date' },
  { accessorKey: 'label', header: 'Label' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Attendance" description="Attendance sessions.">
      <SupabaseTableList
        table="AttendanceSession"
        title="AttendanceSession"
        select="id, sessionDate, label"
        columns={columns}
        searchKeys={['label']}
      />
    </AcadiaPageShell>
  );
}
