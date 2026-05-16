'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'nameEn', header: 'Name (EN)' },
  { accessorKey: 'sortOrder', header: 'Order' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Levels" description="Study levels.">
      <SupabaseTableList
        table="Level"
        title="Level"
        select="id, code, nameEn, nameFr, sortOrder"
        columns={columns}
        searchKeys={['code', 'nameEn']}
      />
    </AcadiaPageShell>
  );
}
