'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getMutationErrorMessage } from '@/lib/acadia/query-errors';
import type { TenantApiKeyCreateValues } from '@/lib/acadia/tenant-api-keys';

async function readApiError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  return payload?.message ?? 'Operation failed.';
}

export type CreatedTenantApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  plaintext: string;
};

function invalidateApiKeyQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record', 'TenantApiKey'] });
}

export function useTenantApiKeyMutations() {
  const queryClient = useQueryClient();

  const createApiKey = useMutation({
    mutationFn: async (
      values: TenantApiKeyCreateValues,
    ): Promise<CreatedTenantApiKey> => {
      const response = await fetch('/api/acadia/account/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const payload = (await response.json().catch(() => null)) as
        | Partial<CreatedTenantApiKey>
        | { message?: string }
        | null;
      if (!response.ok) {
        throw new Error(
          (payload && 'message' in payload && typeof payload.message === 'string'
            ? payload.message
            : null) ?? 'Failed to create API key.',
        );
      }
      if (
        !payload ||
        typeof payload !== 'object' ||
        !('id' in payload) ||
        typeof payload.id !== 'string' ||
        typeof payload.plaintext !== 'string' ||
        typeof payload.name !== 'string' ||
        typeof payload.keyPrefix !== 'string'
      ) {
        throw new Error('Server returned an invalid API key.');
      }
      return {
        id: payload.id,
        name: payload.name,
        keyPrefix: payload.keyPrefix,
        plaintext: payload.plaintext,
      };
    },
    onSuccess: () => {
      invalidateApiKeyQueries(queryClient);
      toast.success('API key created. Copy the secret now; it will not be shown again.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  const revokeApiKey = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/acadia/account/api-keys/${id}`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
    },
    onSuccess: () => {
      invalidateApiKeyQueries(queryClient);
      toast.success('API key revoked.');
    },
    onError: (error) => toast.error(getMutationErrorMessage(error)),
  });

  return { createApiKey, revokeApiKey };
}
