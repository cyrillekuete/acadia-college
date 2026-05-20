import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchAcadiaUserProfile,
  type AcadiaUserProfile,
} from '@/lib/supabase/queries/user';
import { User, UserStatus } from '@/app/models/user';

function parseProfileTimestamp(value: string | undefined): Date {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date(0);
}

function mapProfileToAccountUser(profile: AcadiaUserProfile): User {
  const role = profile.UserRole;
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    roleId: profile.roleId,
    status: (profile.status as UserStatus) ?? UserStatus.ACTIVE,
    createdAt: parseProfileTimestamp(profile.createdAt),
    updatedAt: parseProfileTimestamp(profile.updatedAt),
    isTrashed: profile.isTrashed,
    isProtected: Boolean(profile.isProtected),
    avatar: null,
    role: {
      id: role?.id ?? profile.roleId,
      slug: role?.slug ?? 'user',
      name: role?.name ?? 'User',
      isTrashed: Boolean(role?.isTrashed),
      isProtected: Boolean(role?.isProtected),
      isDefault: Boolean(role?.isDefault),
      createdAt: parseProfileTimestamp(role?.createdAt),
    },
  };
}

function isAccountUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const u = value as User;
  return (
    typeof u.id === 'string' &&
    typeof u.email === 'string' &&
    u.role !== null &&
    typeof u.role === 'object' &&
    typeof u.role.name === 'string'
  );
}

async function fetchAccountUserFromApi(): Promise<User | null> {
  const response = await apiFetch('/api/user-management/account/');
  if (!response.ok) {
    return null;
  }
  const data: unknown = await response.json();
  return isAccountUser(data) ? data : null;
}

async function fetchAccountUserFromSupabase(): Promise<User> {
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

  return mapProfileToAccountUser(result.profile);
}

async function fetchAccountUser(): Promise<User> {
  const fromApi = await fetchAccountUserFromApi();
  if (fromApi) {
    return fromApi;
  }
  return fetchAccountUserFromSupabase();
}

export function useAccountUserQuery() {
  return useQuery({
    queryKey: ['account-profile'],
    queryFn: fetchAccountUser,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
