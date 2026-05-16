'use client';

import { use } from 'react';
import { Badge } from '@/components/ui/badge';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import {
  apiKeyStatus,
  formatDateTime,
  formatRecordValue,
  formatStringArray,
  unwrapRelation,
} from '@/lib/acadia/record-display';

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
  User:createdByUserId ( id, name, email )
`;

type TenantApiKeyDetail = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  User: unknown;
};

export default function TenantApiKeyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useSupabaseRecord<TenantApiKeyDetail>(
    'TenantApiKey',
    id,
    API_KEY_SELECT,
  );

  const creator = unwrapRelation<{ name?: string; email?: string }>(data?.User);
  const status = data
    ? apiKeyStatus(data.revokedAt, data.expiresAt)
    : 'active';

  const title = data?.name ? `API key — ${data.name}` : 'API key';

  return (
    <RecordDetailShell
      title={title}
      description="Tenant API key metadata from Supabase. Secret values are never stored in the client."
      backHref="/account/api-keys"
      backLabel="Back to API keys"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
          <RecordDetailCard
            title="Key"
            fields={[
              { label: 'Name', value: formatRecordValue(data.name) },
              {
                label: 'Prefix',
                value: data.keyPrefix ? `${data.keyPrefix}••••••••` : '—',
              },
              {
                label: 'Status',
                value:
                  status === 'revoked' ? (
                    <Badge variant="destructive" appearance="light">
                      Revoked
                    </Badge>
                  ) : status === 'expired' ? (
                    <Badge variant="secondary" appearance="light">
                      Expired
                    </Badge>
                  ) : (
                    <Badge variant="success" appearance="light">
                      Active
                    </Badge>
                  ),
              },
              { label: 'Scopes', value: formatStringArray(data.scopes) },
              { label: 'Last used', value: formatDateTime(data.lastUsedAt) },
              { label: 'Revoked at', value: formatDateTime(data.revokedAt) },
              { label: 'Expires', value: formatDateTime(data.expiresAt) },
              { label: 'Created', value: formatDateTime(data.createdAt) },
              { label: 'Updated', value: formatDateTime(data.updatedAt) },
            ]}
          />
          <RecordDetailCard
            title="Created by"
            fields={[
              { label: 'Name', value: formatRecordValue(creator?.name) },
              { label: 'Email', value: formatRecordValue(creator?.email) },
            ]}
          />
        </div>
      ) : null}
    </RecordDetailShell>
  );
}
