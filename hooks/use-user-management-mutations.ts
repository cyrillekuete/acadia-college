'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CreateUserFormValues,
  EditUserFormValues,
  TenantSessionSettingsValues,
} from '@/lib/acadia/user-schemas';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { userStatusLogEvent } from '@/lib/acadia/user-management';
import { UserStatus } from '@/app/models/user';
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

function invalidateUserQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['acadia-user-detail'] });
  void queryClient.invalidateQueries({ queryKey: ['acadia-college-session'] });
  void queryClient.invalidateQueries({ queryKey: ['acadia-tenant'] });
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
      invalidateUserQueries(queryClient);
      toast.success('User created.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateUser = useMutation({
    mutationFn: async ({
      id,
      values,
      previousStatus,
      previousRoleId,
    }: {
      id: string;
      values: EditUserFormValues;
      previousStatus?: string;
      previousRoleId?: string;
    }) => {
      if (!tenantId || !actorUserId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('User')
        .update({
          email: values.email.trim().toLowerCase(),
          name: values.name.trim(),
          roleId: values.roleId,
          status: values.status,
          country: values.country?.trim() || null,
          timezone: values.timezone?.trim() || null,
          updatedAt: now,
        })
        .eq('id', id)
        .eq('tenantId', tenantId);

      if (error) {
        throw error;
      }

      const statusEvent =
        previousStatus !== undefined
          ? userStatusLogEvent(previousStatus, values.status)
          : null;

      if (statusEvent) {
        await appendSystemLog(supabase, {
          userId: actorUserId,
          event: statusEvent,
          description: `User ${values.email} status → ${values.status}`,
          entityId: id,
          entityType: 'User',
        });
      }

      if (previousRoleId && previousRoleId !== values.roleId) {
        await appendSystemLog(supabase, {
          userId: actorUserId,
          event: 'user.role_changed',
          description: `User ${values.email} role changed`,
          entityId: id,
          entityType: 'User',
          meta: { fromRoleId: previousRoleId, toRoleId: values.roleId },
        });
      } else if (!statusEvent) {
        await appendSystemLog(supabase, {
          userId: actorUserId,
          event: 'user.updated',
          description: `Updated user ${values.email}`,
          entityId: id,
          entityType: 'User',
        });
      }
    },
    onSuccess: () => {
      invalidateUserQueries(queryClient);
      toast.success('User updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const setUserStatus = useMutation({
    mutationFn: async ({
      id,
      email,
      status,
      previousStatus,
    }: {
      id: string;
      email: string;
      status: (typeof UserStatus)[keyof typeof UserStatus];
      previousStatus: string;
    }) => {
      if (!tenantId || !actorUserId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('User')
        .update({
          status,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenantId', tenantId);

      if (error) {
        throw error;
      }

      const event = userStatusLogEvent(previousStatus, status);
      if (event) {
        await appendSystemLog(supabase, {
          userId: actorUserId,
          event,
          description: `User ${email} status → ${status}`,
          entityId: id,
          entityType: 'User',
        });
      }
    },
    onSuccess: () => {
      invalidateUserQueries(queryClient);
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
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? 'Failed to send reset email.');
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
        meta: values,
      });
    },
    onSuccess: () => {
      invalidateUserQueries(queryClient);
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
