'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import { validateRoleAssignment } from '@/lib/acadia/user-management';
import { canManageUsers } from '@/lib/acadia/roles';
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

export function useUserRoleOptions(options?: { directoryOnly?: boolean }) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const directoryOnly = options?.directoryOnly ?? false;

  return useQuery<UserRoleOption[]>({
    queryKey: ['user-role-options', directoryOnly, session?.roleSlugs],
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

      const rows = (data ?? []) as UserRoleOption[];
      if (session?.roleSlugs?.includes('secretary') && !canManageUsers(session.roleSlugs)) {
        return rows.filter((role) => role.slug.toLowerCase() === 'teacher');
      }
      if (!directoryOnly) {
        return rows;
      }
      return rows.filter((role) =>
        validateRoleAssignment(session?.roleSlugs, role.slug).ok,
      );
    },
    enabled: isAcadiaTenantQueryEnabled(
      isLoading,
      isError,
      session,
      session?.tenantId ?? null,
    ),
  });
}
