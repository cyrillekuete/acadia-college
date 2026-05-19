'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export function useSupabaseRecord<T extends Record<string, unknown>>(
  table: string,
  id: string | undefined,
  select: string,
  tenantColumn = 'tenantId',
) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['supabase-record', table, id, tenantId, select, tenantColumn],
    queryFn: async () => {
      if (!tenantId || !id) {
        throw new Error('Record context is required');
      }
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .eq(tenantColumn, tenantId)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error('Record not found');
      }
      return data as unknown as T;
    },
    enabled:
      !!id &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
