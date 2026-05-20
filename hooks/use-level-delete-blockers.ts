'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchLevelDeleteBlockers,
  type LevelDeleteBlockers,
} from '@/lib/supabase/queries/level-delete';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';

export function useLevelDeleteBlockers(levelId: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['level-delete-blockers', tenantId, levelId],
    queryFn: async (): Promise<LevelDeleteBlockers> => {
      const supabase = requireBrowserClient();
      return fetchLevelDeleteBlockers(supabase, tenantId!, levelId!);
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      levelId !== null,
  });
}

export function getLevelDeleteBlockersErrorMessage(error: unknown): string {
  return getQueryErrorMessage(error);
}
