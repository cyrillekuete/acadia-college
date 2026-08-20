'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { StaffUpdateInput } from '@/lib/acadia/staff-create-schemas';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { invalidateAcadiaCache } from '@/lib/acadia/cache/invalidate-client';
import { staffListTags } from '@/lib/acadia/cache/tags';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

async function readApiError(res: Response): Promise<string> {
  const json = (await res.json().catch(() => null)) as { message?: string } | null;
  return json?.message || `Request failed (${res.status}).`;
}

export function useStaffMutations() {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const { t } = useTranslation();
  const tenantId = session?.tenantId ?? null;
  const canWrite = canWriteRegistry(session?.roleSlug);

  const invalidate = (profileId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['staff-list'] });
    void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
    if (profileId) {
      void queryClient.invalidateQueries({
        queryKey: ['supabase-record', 'StaffProfile', profileId],
      });
    }
    if (tenantId) {
      invalidateAcadiaCache(staffListTags(tenantId));
    }
  };

  const updateStaff = useMutation({
    mutationFn: async ({
      profileId,
      values,
    }: {
      profileId: string;
      values: StaffUpdateInput;
    }) => {
      if (!canWrite) {
        throw new Error('You do not have permission to modify registry records.');
      }
      const res = await fetch(`/api/acadia/staff/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      invalidate(variables.profileId);
      toast.success(t('staff.updatedToast'));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('staff.updateFailed'));
    },
  });

  const deactivateStaff = useMutation({
    mutationFn: async ({ profileId }: { profileId: string }) => {
      if (!canWrite) {
        throw new Error('You do not have permission to modify registry records.');
      }
      const res = await fetch(`/api/acadia/staff/${profileId}/deactivate`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      invalidate(variables.profileId);
      toast.success(t('staff.deactivatedToast'));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t('staff.deactivateFailed'),
      );
    },
  });

  return { updateStaff, deactivateStaff, canWrite };
}
