'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type SubjectGroupingOption = {
  id: string;
  nameEn: string;
  nameFr: string;
  code: string | null;
};

export function useSubjectGroupingOptions() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['subject-grouping-options', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('SubjectGrouping')
        .select('id, nameEn, nameFr, code')
        .eq('tenantId', tenantId!)
        .order('sortOrder', { ascending: true })
        .order('nameEn', { ascending: true });

      if (error) {
        throw error;
      }
      return (data ?? []) as SubjectGroupingOption[];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
