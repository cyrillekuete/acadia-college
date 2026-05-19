'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'slug', header: 'Slug' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'description', header: 'Description' },
  {
    accessorKey: 'isDefault',
    header: 'Default',
    cell: ({ row }) => (row.original.isDefault ? 'Yes' : '—'),
  },
  {
    accessorKey: 'isProtected',
    header: 'Protected',
    cell: ({ row }) => (row.original.isProtected ? 'Yes' : '—'),
  },
];

export default function AdminRolesPage() {
  return (
    <AcadiaPageShell
      title="Acadia College — Roles"
      description="Role catalog used when assigning users. Change a user's role from the Users screen."
    >
      <p className="mb-4 text-sm text-muted-foreground">
        To assign or change roles, open a user from{' '}
        <Link href="/admin/users" className="text-primary hover:underline">
          Users
        </Link>
        .
      </p>
      <SupabaseTableList
        table="UserRole"
        title="Roles"
        select="id, slug, name, description, isDefault, isProtected, createdAt"
        columns={columns}
        searchKeys={['slug', 'name']}
      />
    </AcadiaPageShell>
  );
}
