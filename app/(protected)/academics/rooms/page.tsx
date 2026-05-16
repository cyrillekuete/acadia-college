'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'nameEn', header: 'Name (EN)' },
  { accessorKey: 'capacity', header: 'Capacity' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Rooms" description="Rooms and facilities.">
      <SupabaseTableList
        table="Room"
        title="Room"
        select="id, code, nameEn, nameFr, capacity"
        columns={columns}
        searchKeys={['code', 'nameEn']}
      />
    </AcadiaPageShell>
  );
}
