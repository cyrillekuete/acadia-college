'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'nameEn', header: 'Name (EN)' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Scholarships" description="Scholarship types.">
      <SupabaseTableList
        table="ScholarshipType"
        title="ScholarshipType"
        select="id, code, nameEn, nameFr"
        columns={columns}
        searchKeys={['code', 'nameEn']}
      />
    </AcadiaPageShell>
  );
}
