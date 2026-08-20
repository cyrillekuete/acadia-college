'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { TenantApiKeyCreateDialog } from '@/components/acadia/account/tenant-api-key-create-dialog';
import { useTenantApiKeyMutations } from '@/hooks/use-tenant-api-key-mutations';
import {
  apiKeyStatus,
  formatStringArray,
} from '@/lib/acadia/record-display';
import {
  detailLinkColumn,
  nestedFieldColumn,
} from '@/lib/acadia/list-columns';
import { TENANT_API_KEY_PUBLIC_SELECT } from '@/lib/acadia/tenant-api-keys';

type ApiKeyRow = {
  id: string;
  name?: string;
  keyPrefix?: string;
  scopes?: unknown;
  revokedAt?: string | null;
  expiresAt?: string | null;
  User?: unknown;
} & Record<string, unknown>;

function RevokeApiKeyButton({ id, revokedAt }: { id: string; revokedAt?: string | null }) {
  const { revokeApiKey } = useTenantApiKeyMutations();
  if (revokedAt) {
    return null;
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={revokeApiKey.isPending}
      onClick={() => {
        if (!window.confirm('Revoke this API key? Existing integrations will stop working.')) {
          return;
        }
        revokeApiKey.mutate(id);
      }}
    >
      Revoke
    </Button>
  );
}

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
  {
    id: 'revoke',
    header: '',
    cell: ({ row }) => (
      <RevokeApiKeyButton id={row.original.id} revokedAt={row.original.revokedAt} />
    ),
  },
];

export function TenantApiKeysList() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <SupabaseTableList
        table="TenantApiKey"
        title="Tenant API keys"
        select={TENANT_API_KEY_PUBLIC_SELECT}
        columns={columns}
        searchKeys={['name', 'keyPrefix']}
        toolbarExtra={
          <div className="flex justify-end">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus />
              Create API key
            </Button>
          </div>
        }
      />
      <TenantApiKeyCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
