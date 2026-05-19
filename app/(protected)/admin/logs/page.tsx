'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Input } from '@/components/ui/input';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';
type Row = {
  id: string;
  event?: string;
  description?: string;
  createdAt?: string;
  userId?: string;
  User?: unknown;
} & Record<string, unknown>;

const SELECT = `
  id,
  event,
  description,
  createdAt,
  userId,
  entityType,
  entityId,
  User:userId ( email, name )
`;

export default function AdminLogsPage() {
  const [userFilter, setUserFilter] = useState('');

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'event', header: 'Event' },
      { accessorKey: 'description', header: 'Description' },
      nestedFieldColumn<Row>('actor', 'Actor', 'User', 'email'),
      { accessorKey: 'entityType', header: 'Entity' },
      { accessorKey: 'createdAt', header: 'When' },
    ],
    [],
  );

  return (
    <AcadiaPageShell
      title="Acadia College — System log"
      description="Audit trail for user management and institution settings."
    >
      <div className="mb-4 max-w-xs">
        <Input
          placeholder="Filter by user email…"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        />
      </div>
      <SupabaseTableList
        table="SystemLog"
        title="Activity log"
        select={SELECT}
        columns={columns}
        searchKeys={['event', 'description']}
        rowFilter={(row) => {
          if (!userFilter.trim()) {
            return true;
          }
          const user = row.User as { email?: string; name?: string } | null;
          const q = userFilter.toLowerCase();
          return (
            String(user?.email ?? '')
              .toLowerCase()
              .includes(q) ||
            String(user?.name ?? '')
              .toLowerCase()
              .includes(q) ||
            String(row.userId ?? '')
              .toLowerCase()
              .includes(q)
          );
        }}
      />
    </AcadiaPageShell>
  );
}
