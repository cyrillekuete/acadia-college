'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('admin.roles')}
      description={t('admin.rolesDescription')}
    >
      <p className="mb-4 text-sm text-muted-foreground">
        To assign or change roles, open a user from{' '}
        <Link href="/admin/users" className="text-primary hover:underline">
          {t('admin.users')}
        </Link>
        .
      </p>
      <SupabaseTableList
        table="UserRole"
        title={t('admin.roles')}
        select="id, slug, name, description, isDefault, isProtected, createdAt"
        columns={columns}
        searchKeys={['slug', 'name']}
      />
    </AcadiaPageShell>
  );
}
