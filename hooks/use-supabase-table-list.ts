'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

type ColumnFilter = { column: string; value: string | number | boolean };
type InColumnFilter = { column: string; values: string[] };

export function useSupabaseTableList<T extends Record<string, unknown>>(
  table: string,
  select = '*',
  tenantColumn = 'tenantId',
  filters?: ColumnFilter[],
  options?: { enabled?: boolean; inFilters?: InColumnFilter[] },
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const extraEnabled = options?.enabled ?? true;

  return useQuery({
    queryKey: [
      'supabase-list',
      table,
      tenantId,
      select,
      tenantColumn,
      JSON.stringify(filters ?? null),
      JSON.stringify(options?.inFilters ?? null),
    ],
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

      for (const f of options?.inFilters ?? []) {
        if (f.values.length > 0) {
          query = query.in(f.column, f.values);
        }
      }

      const { data, error } = await query.limit(200);
      if (error) {
        throw error;
      }
      return (data ?? []) as unknown as T[];
    },
    enabled:
      extraEnabled &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      !(options?.inFilters?.some((f) => f.values.length === 0)),
  });
}
