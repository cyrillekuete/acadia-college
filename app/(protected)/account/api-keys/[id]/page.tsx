'use client';

import { Fragment, use } from 'react';
import Link from 'next/link';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useSettings } from '@/providers/settings-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { PageNavbar } from '@/app/(protected)/account/page-navbar';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import {
  apiKeyStatus,
  formatDateTime,
  formatRecordValue,
  formatStringArray,
  unwrapRelation,
} from '@/lib/acadia/record-display';
import { Skeleton } from '@/components/ui/skeleton';

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

function getQueryErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Failed to load record.';
}

export default function TenantApiKeyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { settings } = useSettings();
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
    <Fragment>
      <PageNavbar />
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle />
              <ToolbarDescription>
                Central Hub for Personal Customization
              </ToolbarDescription>
            </ToolbarHeading>
            <ToolbarActions>
              <Button variant="outline" asChild>
                <Link href="/account/api-keys">Back to API keys</Link>
              </Button>
            </ToolbarActions>
          </Toolbar>
        </Container>
      )}
      <Container>
        <div className="mb-5">
          {settings?.layout !== 'demo1' && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/account/api-keys">Back to API keys</Link>
            </Button>
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">{getQueryErrorMessage(error)}</p>
        ) : data ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
            <RecordDetailCard
              title={title}
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
      </Container>
    </Fragment>
  );
}
