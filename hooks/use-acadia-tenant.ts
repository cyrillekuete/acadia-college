'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import {
  fetchAcadiaTenant,
  type AcadiaTenant,
} from '@/lib/supabase/queries/tenant';

export function useAcadiaTenant() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery<AcadiaTenant | null>({
    queryKey: ['acadia-tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        return null;
      }
      const supabase = requireBrowserClient();
      return fetchAcadiaTenant(supabase, tenantId);
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
