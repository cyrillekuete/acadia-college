'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

type ColumnFilter = { column: string; value: string | number | boolean };
type InColumnFilter = { column: string; values: string[] };
type ListOrder = { column: string; ascending?: boolean };

export function useSupabaseTableList<T extends Record<string, unknown>>(
  table: string,
  select = '*',
  tenantColumn: string | null = 'tenantId',
  filters?: ColumnFilter[],
  options?: {
    enabled?: boolean;
    inFilters?: InColumnFilter[];
    or?: string;
    order?: ListOrder;
    limit?: number;
    gte?: ColumnFilter[];
    lte?: ColumnFilter[];
  },
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const extraEnabled = options?.enabled ?? true;
  const limit = options?.limit ?? 200;

  return useQuery({
    queryKey: [
      'supabase-list',
      table,
      tenantId,
      select,
      tenantColumn,
      JSON.stringify(filters ?? null),
      JSON.stringify(options?.inFilters ?? null),
      options?.or ?? null,
      JSON.stringify(options?.order ?? null),
      JSON.stringify(options?.gte ?? null),
      JSON.stringify(options?.lte ?? null),
      limit,
    ],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant context is required');
      }
      const supabase = requireBrowserClient();
      let query = supabase.from(table).select(select);
      if (tenantColumn) {
        query = query.eq(tenantColumn, tenantId);
      }

      for (const f of filters ?? []) {
        query = query.eq(f.column, f.value);
      }

      for (const f of options?.inFilters ?? []) {
        if (f.values.length > 0) {
          query = query.in(f.column, f.values);
        }
      }

      if (options?.or) {
        query = query.or(options.or);
      }

      for (const f of options?.gte ?? []) {
        query = query.gte(f.column, f.value);
      }

      for (const f of options?.lte ?? []) {
        query = query.lte(f.column, f.value);
      }

      if (options?.order?.column) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending ?? true,
        });
      }

      const { data, error } = await query.limit(limit);
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
