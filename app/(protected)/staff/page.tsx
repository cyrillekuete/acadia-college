'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'staffCode', header: 'Code' },
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'employmentType', header: 'Employment' },
  { accessorKey: 'isActive', header: 'Active' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Staff" description="Staff profiles from Supabase.">
      <SupabaseTableList
        table="StaffProfile"
        title="StaffProfile"
        select="id, staffCode, title, employmentType, isActive"
        columns={columns}
        searchKeys={['staffCode', 'title']}
      />
    </AcadiaPageShell>
  );
}
