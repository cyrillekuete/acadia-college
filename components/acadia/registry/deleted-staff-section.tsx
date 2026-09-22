'use client';

import { useQuery } from '@tanstack/react-query';
import { DeletedProfileList } from '@/components/acadia/registry/deleted-profile-list';
import { useStaffMutations } from '@/hooks/use-staff-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchDeletedStaff } from '@/lib/supabase/queries/staff-list';

export function DeletedStaffSection() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { restoreStaff, purgeStaff } = useStaffMutations();

  const { data, isLoading } = useQuery({
    queryKey: ['deleted-staff', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchDeletedStaff(supabase, tenantId!);
    },
    enabled: isAcadiaTenantQueryEnabled(sessionLoading, isError, session, tenantId),
  });

  const pendingId =
    (restoreStaff.isPending ? restoreStaff.variables?.profileId : null) ??
    (purgeStaff.isPending ? purgeStaff.variables?.profileId : null);

  return (
    <DeletedProfileList
      rows={(data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        code: row.staffCode ?? '—',
        deletedAt: row.deletedAt,
      }))}
      isLoading={isLoading}
      idColumnLabel={t('staff.staffCode')}
      emptyMessage={t('staff.deletedEmpty')}
      pendingId={pendingId}
      onRestore={(id) => restoreStaff.mutate({ profileId: id })}
      onPurge={(id) => purgeStaff.mutate({ profileId: id })}
    />
  );
}
