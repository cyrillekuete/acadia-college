'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'slug', header: 'Slug' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'isDefault', header: 'Default' },
];

export default function AdminRolesPage() {
  return (
    <AcadiaPageShell
      title="Acadia College — Roles"
      description="User roles from Supabase UserRole table."
    >
      <SupabaseTableList
        table="UserRole"
        title="UserRole"
        select="id, slug, name, description, isDefault, isProtected, createdAt"
        columns={columns}
        searchKeys={['slug', 'name']}
      />
    </AcadiaPageShell>
  );
}
