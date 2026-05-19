'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type UserRoleOption = {
  id: string;
  slug: string;
  name: string;
  isProtected: boolean;
};

export function useUserRoleOptions() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();

  return useQuery<UserRoleOption[]>({
    queryKey: ['user-role-options'],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('UserRole')
        .select('id, slug, name, isProtected')
        .eq('isTrashed', false)
        .order('name');

      if (error) {
        throw error;
      }

      return (data ?? []) as UserRoleOption[];
    },
    enabled: isAcadiaTenantQueryEnabled(
      isLoading,
      isError,
      session,
      session?.tenantId ?? null,
    ),
  });
}
