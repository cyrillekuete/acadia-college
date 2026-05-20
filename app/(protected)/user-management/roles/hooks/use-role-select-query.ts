import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { requireBrowserClient } from '@/lib/supabase/client';

export type RoleSelectOption = {
  id: string;
  name: string;
};

async function fetchRolesFromSupabase(): Promise<RoleSelectOption[]> {
  const supabase = requireBrowserClient();
  const { data, error } = await supabase
    .from('UserRole')
    .select('id, name')
    .eq('isTrashed', false)
    .order('name');

  if (error) {
    throw error;
  }

  return (data ?? []) as RoleSelectOption[];
}

async function fetchRoleList(): Promise<RoleSelectOption[]> {
  const response = await apiFetch('/api/user-management/roles/select');

  if (response.ok) {
    const data: unknown = await response.json();
    if (Array.isArray(data)) {
      return data as RoleSelectOption[];
    }
  }

  try {
    return await fetchRolesFromSupabase();
  } catch (error) {
    toast.error(
      'Something went wrong while loading roles. Please try again.',
      { position: 'top-center' },
    );
    throw error instanceof Error
      ? error
      : new Error('Failed to load roles for selection.');
  }
}

/** Roles for filter dropdowns (REST API with Supabase fallback). */
export const useRoleSelectQuery = () => {
  return useQuery({
    queryKey: ['user-role-select'],
    queryFn: fetchRoleList,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
};
