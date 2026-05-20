'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchClassDeleteBlockers,
  type ClassDeleteBlockers,
} from '@/lib/supabase/queries/class-delete';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';

export function useClassDeleteBlockers(classId: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['class-delete-blockers', tenantId, classId],
    queryFn: async (): Promise<ClassDeleteBlockers> => {
      const supabase = requireBrowserClient();
      return fetchClassDeleteBlockers(supabase, tenantId!, classId!);
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      classId !== null,
  });
}

export function getClassDeleteBlockersErrorMessage(error: unknown): string {
  return getQueryErrorMessage(error);
}
