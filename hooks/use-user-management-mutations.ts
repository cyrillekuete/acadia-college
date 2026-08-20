'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CreateUserFormValues,
  EditUserFormValues,
  TenantSessionSettingsValues,
} from '@/lib/acadia/user-schemas';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { UserStatus } from '@/app/models/user';
import { invalidateAcadiaCache } from '@/lib/acadia/cache/invalidate-client';
import { catalogTag, dashboardTags } from '@/lib/acadia/cache/tags';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Operation failed.';
}

async function readApiError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  return payload?.message ?? 'Operation failed.';
}

function invalidateUserQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['acadia-user-detail'] });
  void queryClient.invalidateQueries({ queryKey: ['acadia-college-session'] });
  void queryClient.invalidateQueries({ queryKey: ['acadia-tenant'] });
  if (tenantId) {
    invalidateAcadiaCache([catalogTag(tenantId), ...dashboardTags(tenantId)]);
  }
}

export function useUserManagementMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const actorUserId = session?.authUser?.id ?? null;

  const createUser = useMutation({
    mutationFn: async (values: CreateUserFormValues) => {
      const response = await fetch('/api/acadia/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as { message?: string; id?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? 'Failed to create user.');
      }
      return payload.id;
    },
    onSuccess: () => {
      invalidateUserQueries(queryClient, tenantId);
      toast.success('User created.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateUser = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: EditUserFormValues;
      previousStatus?: string;
      previousRoleId?: string;
    }) => {
      const response = await fetch(
        `/api/acadia/admin/users/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
    },
    onSuccess: () => {
      invalidateUserQueries(queryClient, tenantId);
      toast.success('User updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const setUserStatus = useMutation({
    mutationFn: async ({
      id,
      email,
      name,
      roleId,
      status,
      country,
      timezone,
      expectedUpdatedAt,
      isTrashed,
    }: {
      id: string;
      email: string;
      name?: string;
      roleId: string;
      status: (typeof UserStatus)[keyof typeof UserStatus];
      country?: string | null;
      timezone?: string | null;
      expectedUpdatedAt?: string;
      isTrashed?: boolean;
      previousStatus: string;
    }) => {
      const response = await fetch(
        `/api/acadia/admin/users/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name: name || email,
            roleId,
            status,
            country: country ?? '',
            timezone: timezone ?? '',
            expectedUpdatedAt,
            isTrashed,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
    },
    onSuccess: () => {
      invalidateUserQueries(queryClient, tenantId);
      toast.success('User status updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const sendPasswordReset = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(
        `/api/acadia/admin/users/${encodeURIComponent(userId)}/reset-password`,
        { method: 'POST' },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
    },
    onSuccess: () => toast.success('Password reset email sent.'),
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateSessionSettings = useMutation({
    mutationFn: async (values: TenantSessionSettingsValues) => {
      if (!tenantId || !actorUserId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('Tenant')
        .update({
          sessionTimeoutMinutes: values.sessionTimeoutMinutes,
          sessionWarningMinutes: values.sessionWarningMinutes,
          updatedAt: now,
        })
        .eq('id', tenantId);

      if (error) {
        throw error;
      }

      await appendSystemLog(supabase, {
        userId: actorUserId,
        event: 'tenant.session_settings_updated',
        description: 'Session timeout settings updated',
        entityId: tenantId,
        entityType: 'Tenant',
        tenantId,
        meta: values,
      });
    },
    onSuccess: () => {
      invalidateUserQueries(queryClient, tenantId);
      toast.success('Session settings saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    createUser,
    updateUser,
    setUserStatus,
    sendPasswordReset,
    updateSessionSettings,
  };
}
