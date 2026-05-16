'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export function useSupabaseTableList<T extends Record<string, unknown>>(
  table: string,
  select = '*',
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['supabase-list', table, tenantId, select],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant context is required');
      }
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .eq('tenantId', tenantId)
        .limit(200);
      if (error) {
        throw error;
      }
      return (data ?? []) as unknown as T[];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
