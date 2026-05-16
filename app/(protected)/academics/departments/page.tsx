'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'nameEn', header: 'Name (EN)' },
  { accessorKey: 'nameFr', header: 'Name (FR)' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Departments" description="Academic departments.">
      <SupabaseTableList
        table="Department"
        title="Department"
        select="id, code, nameEn, nameFr"
        columns={columns}
        searchKeys={['code', 'nameEn']}
      />
    </AcadiaPageShell>
  );
}
