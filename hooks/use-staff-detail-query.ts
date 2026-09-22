'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchStaffDetail,
  StaffDetailNotFoundError,
} from '@/lib/supabase/queries/staff-detail';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';

export function useStaffDetailQuery(staffId: string | undefined) {
  const { data: session, isLoading: sessionLoading, isError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['staff-detail', tenantId, staffId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const detail = await fetchStaffDetail(supabase, tenantId!, staffId!);
      if (!detail) {
        throw new StaffDetailNotFoundError();
      }
      return detail;
    },
    meta: { suppressGlobalError: true },
    retry: (failureCount, error) =>
      !(error instanceof StaffDetailNotFoundError) && failureCount < 2,
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, isError, session, tenantId) &&
      !!staffId,
  });
}
