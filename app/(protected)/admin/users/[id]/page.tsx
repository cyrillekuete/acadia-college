'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import {
  UserEditForm,
  type AdminUserRecord,
} from '@/components/acadia/admin/user-edit-form';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { formatRecordValue, unwrapRelation } from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { canManageUsers } from '@/lib/acadia/roles';

const USER_DETAIL_SELECT = `
  id,
  email,
  name,
  status,
  roleId,
  country,
  timezone,
  createdAt,
  updatedAt,
  lastSignInAt,
  isProtected,
  UserRole:roleId ( slug, name )
`;

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = typeof params.id === 'string' ? params.id : '';
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManageUsers(session?.roleSlug);

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['acadia-user-detail', userId, tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error: queryError } = await supabase
        .from('User')
        .select(USER_DETAIL_SELECT)
        .eq('id', userId)
        .eq('tenantId', tenantId!)
        .maybeSingle();

      if (queryError) {
        throw queryError;
      }
      return data as AdminUserRecord & {
        createdAt?: string;
        updatedAt?: string;
        lastSignInAt?: string | null;
        UserRole?: unknown;
      };
    },
    enabled:
      Boolean(userId) &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const role = unwrapRelation(user?.UserRole);

  return (
    <AccountDataState
      isLoading={isLoading || sessionLoading}
      isError={isError}
      error={error}
      isEmpty={!user}
      emptyMessage="User not found in your institution."
    >
      {user ? (
        <div className="flex flex-col gap-6 lg:max-w-xl">
          <RecordDetailCard
            title="Account summary"
            fields={[
              { label: 'Email', value: formatRecordValue(user.email) },
              { label: 'Role', value: formatRecordValue(role?.name ?? role?.slug) },
              { label: 'Status', value: formatRecordValue(user.status) },
              {
                label: 'Last sign-in',
                value: formatRecordValue(user.lastSignInAt),
              },
              { label: 'Created', value: formatRecordValue(user.createdAt) },
            ]}
          />
          {canManage ? (
            <UserEditForm user={user} />
          ) : (
            <p className="text-sm text-muted-foreground">
              You do not have permission to edit users.
            </p>
          )}
        </div>
      ) : null}
    </AccountDataState>
  );
}
