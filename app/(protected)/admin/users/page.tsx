'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';

type Row = {
  id: string;
  email?: string;
  UserRole?: unknown;
} & Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
  nestedFieldColumn<Row>('role', 'Role', 'UserRole', 'name'),
  { accessorKey: 'createdAt', header: 'Created' },
];

const SELECT = `
  id,
  email,
  name,
  status,
  createdAt,
  UserRole:roleId ( slug, name )
`;

export default function AdminUsersPage() {
  return (
    <AcadiaPageShell
      title="Acadia College — Users"
      description="Tenant users from Supabase (not Prisma user-management)."
    >
      <SupabaseTableList
        table="User"
        title="User"
        select={SELECT}
        columns={columns}
        searchKeys={['email', 'name']}
      />
    </AcadiaPageShell>
  );
}
