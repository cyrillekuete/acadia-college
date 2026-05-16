'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import {
  apiKeyStatus,
  formatStringArray,
} from '@/lib/acadia/record-display';
import {
  detailLinkColumn,
  nestedFieldColumn,
} from '@/lib/acadia/list-columns';

type ApiKeyRow = {
  id: string;
  name?: string;
  keyPrefix?: string;
  scopes?: unknown;
  revokedAt?: string | null;
  expiresAt?: string | null;
  User?: unknown;
} & Record<string, unknown>;

const API_KEY_SELECT = `
  id,
  name,
  keyPrefix,
  scopes,
  lastUsedAt,
  revokedAt,
  expiresAt,
  createdAt,
  updatedAt,
  User:createdByUserId ( name, email )
`;

const columns: ColumnDef<ApiKeyRow>[] = [
  detailLinkColumn<ApiKeyRow>('/account/api-keys', 'name', 'Name'),
  {
    accessorKey: 'keyPrefix',
    header: 'Key prefix',
    cell: ({ row }) => {
      const prefix = row.original.keyPrefix;
      return prefix ? `${prefix}••••••••` : '—';
    },
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = apiKeyStatus(row.original.revokedAt, row.original.expiresAt);
      if (status === 'revoked') {
        return (
          <Badge variant="destructive" appearance="light">
            Revoked
          </Badge>
        );
      }
      if (status === 'expired') {
        return (
          <Badge variant="secondary" appearance="light">
            Expired
          </Badge>
        );
      }
      return (
        <Badge variant="success" appearance="light">
          Active
        </Badge>
      );
    },
  },
  {
    id: 'scopes',
    header: 'Scopes',
    cell: ({ row }) => formatStringArray(row.original.scopes),
  },
  nestedFieldColumn<ApiKeyRow>('createdBy', 'Created by', 'User', 'name'),
  { accessorKey: 'lastUsedAt', header: 'Last used' },
  { accessorKey: 'expiresAt', header: 'Expires' },
];

export function TenantApiKeysList() {
  return (
    <SupabaseTableList
      table="TenantApiKey"
      title="Tenant API keys"
      select={API_KEY_SELECT}
      columns={columns}
      searchKeys={['name', 'keyPrefix']}
    />
  );
}
