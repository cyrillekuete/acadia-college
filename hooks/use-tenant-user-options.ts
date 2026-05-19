'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { unwrapRelation } from '@/lib/acadia/record-display';

export type TenantUserOption = {
  id: string;
  name: string;
  email: string | null;
  roleSlug: string | null;
};

export function useTenantUserOptions(excludeUserId?: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery<TenantUserOption[]>({
    queryKey: ['tenant-user-options', tenantId, excludeUserId],
    queryFn: async () => {
      if (!tenantId) {
        return [];
      }
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('User')
        .select(
          `
          id,
          name,
          email,
          UserRole:roleId ( slug )
        `,
        )
        .eq('tenantId', tenantId)
        .eq('status', 'ACTIVE')
        .eq('isTrashed', false)
        .order('name');
      if (error) {
        throw error;
      }

      return (data ?? [])
        .filter((row) => row.id !== excludeUserId)
        .map((row) => {
          const role = unwrapRelation<{ slug?: string }>(row.UserRole);
          return {
            id: row.id as string,
            name: String(row.name ?? row.email ?? row.id),
            email: (row.email as string | null) ?? null,
            roleSlug: role?.slug ?? null,
          } satisfies TenantUserOption;
        });
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
