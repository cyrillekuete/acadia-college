'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/** Drop staff caches when the signed-in tenant changes so list and detail stay aligned. */
export function useInvalidateTenantScopedQueries(
  tenantId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const next = tenantId ?? null;
    if (previous.current === undefined) {
      previous.current = next;
      return;
    }
    if (previous.current === next) {
      return;
    }
    previous.current = next;
    void queryClient.invalidateQueries({ queryKey: ['staff-list'] });
    void queryClient.invalidateQueries({ queryKey: ['staff-detail'] });
  }, [queryClient, tenantId]);
}
