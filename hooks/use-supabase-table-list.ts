'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

type ColumnFilter = { column: string; value: string | number | boolean };

export function useSupabaseTableList<T extends Record<string, unknown>>(
  table: string,
  select = '*',
  tenantColumn = 'tenantId',
  filters?: ColumnFilter[],
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['supabase-list', table, tenantId, select, tenantColumn, JSON.stringify(filters ?? null)],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant context is required');
      }
      const supabase = requireBrowserClient();
      let query = supabase
        .from(table)
        .select(select)
        .eq(tenantColumn, tenantId);

      for (const f of filters ?? []) {
        query = query.eq(f.column, f.value);
      }

      const { data, error } = await query.limit(200);
      if (error) {
        throw error;
      }
      return (data ?? []) as unknown as T[];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
