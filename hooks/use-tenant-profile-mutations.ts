'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getMutationErrorMessage } from '@/lib/acadia/query-errors';
import { appendSystemLog } from '@/lib/acadia/system-log';
import {
  buildTenantProfilePatch,
  type TenantProfileField,
} from '@/lib/acadia/tenant-profile';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';

export function useTenantProfileMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const actorUserId = session?.authUser?.id ?? null;

  const updateField = useMutation({
    mutationFn: async ({
      field,
      value,
    }: {
      field: TenantProfileField;
      value: string;
    }) => {
      if (!tenantId || !actorUserId) {
        throw new Error('Tenant context is required.');
      }

      const patch = buildTenantProfilePatch(field, value);
      if ('error' in patch) {
        throw new Error(patch.error);
      }

      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('Tenant')
        .update({
          ...patch,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', tenantId);

      if (error) {
        throw error;
      }

      await appendSystemLog(supabase, {
        userId: actorUserId,
        event: 'tenant.profile_updated',
        description: `Institution field ${field} updated`,
        entityId: tenantId,
        entityType: 'Tenant',
        meta: { field, ...patch },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['acadia-tenant'] });
      toast.success(
        t('account.institutionSaved', {
          defaultValue: 'Institution details saved.',
        }),
      );
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error));
    },
  });

  return { updateField };
}
