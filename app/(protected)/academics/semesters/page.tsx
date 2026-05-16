'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'labelEn', header: 'Label (EN)' },
  { accessorKey: 'labelFr', header: 'Label (FR)' },
  { accessorKey: 'startsOn', header: 'Starts' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Semesters" description="Semesters per academic year.">
      <SupabaseTableList
        table="Semester"
        title="Semester"
        select="id, labelEn, labelFr, startsOn, endsOn"
        columns={columns}
        searchKeys={['labelEn', 'labelFr']}
      />
    </AcadiaPageShell>
  );
}
