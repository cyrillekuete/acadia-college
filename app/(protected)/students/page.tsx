'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'registrationNumber', header: 'Matricule' },
  { accessorKey: 'isActive', header: 'Active' },
  { accessorKey: 'createdAt', header: 'Created' },
];

export default function Page() {
  return (
    <AcadiaPageShell title="Acadia College — Students" description="Student registry from Supabase.">
      <SupabaseTableList
        table="StudentProfile"
        title="StudentProfile"
        select="id, registrationNumber, isActive, createdAt"
        columns={columns}
        searchKeys={['registrationNumber']}
      />
    </AcadiaPageShell>
  );
}
