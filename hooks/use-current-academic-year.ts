'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchAcademicYearSetupStatus,
  type AcademicYearSetupStatus,
  type CurrentAcademicYear,
} from '@/lib/supabase/queries/academic-year';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type UseCurrentAcademicYearResult = {
  currentYear: CurrentAcademicYear | null;
  currentYearId: string | null;
  isConfigured: boolean;
  yearCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useCurrentAcademicYearQuery(): UseCurrentAcademicYearResult & {
  setupStatus: AcademicYearSetupStatus | undefined;
} {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const query = useQuery({
    queryKey: ['current-academic-year', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchAcademicYearSetupStatus(supabase, tenantId!);
    },
    staleTime: 60_000,
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  const setupStatus = query.data;
  const currentYear = setupStatus?.current ?? null;

  return {
    setupStatus,
    currentYear,
    currentYearId: currentYear?.id ?? null,
    isConfigured: setupStatus?.configured ?? false,
    yearCount: setupStatus?.yearCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
