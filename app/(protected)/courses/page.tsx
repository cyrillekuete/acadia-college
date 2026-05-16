'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'nameEn', header: 'Name (EN)' },
  { accessorKey: 'nameFr', header: 'Name (FR)' },
  { accessorKey: 'credits', header: 'Credits' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Courses" description="Course catalog.">
      <SupabaseTableList
        table="Course"
        title="Course"
        select="id, code, nameEn, nameFr, credits, hours"
        columns={columns}
        searchKeys={['code', 'nameEn', 'nameFr']}
      />
    </AcadiaPageShell>
  );
}
