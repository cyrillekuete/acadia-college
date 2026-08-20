import { useQuery } from '@tanstack/react-query';
import { mapAcadiaProfileToAccountUser } from '@/lib/api/user-management-supabase';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchAcadiaUserProfile } from '@/lib/supabase/queries/user';
import { User } from '@/app/models/user';

async function fetchAccountUser(): Promise<User> {
  const supabase = requireBrowserClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error('Not signed in.');
  }

  const result = await fetchAcadiaUserProfile(supabase, authUser.id);
  if (result.status !== 'ok') {
    throw new Error('Could not load account profile.');
  }

  return mapAcadiaProfileToAccountUser(result.profile);
}

export function useAccountUserQuery() {
  return useQuery({
    queryKey: ['account-profile'],
    queryFn: fetchAccountUser,
    staleTime: 30_000,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
