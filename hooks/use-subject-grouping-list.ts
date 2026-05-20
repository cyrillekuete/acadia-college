'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type SubjectGroupingListRow = {
  id: string;
  nameEn: string;
  nameFr: string;
  code: string | null;
  sortOrder: number;
  subjectCount: number;
};

export function useSubjectGroupingList() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['subject-grouping-list', tenantId],
    queryFn: async (): Promise<SubjectGroupingListRow[]> => {
      const supabase = requireBrowserClient();
      const [groupingsResult, subjectsResult] = await Promise.all([
        supabase
          .from('SubjectGrouping')
          .select('id, nameEn, nameFr, code, sortOrder')
          .eq('tenantId', tenantId!)
          .order('sortOrder', { ascending: true })
          .order('nameEn', { ascending: true }),
        supabase
          .from('Subject')
          .select('groupingId')
          .eq('tenantId', tenantId!)
          .is('deactivatedAt', null),
      ]);

      if (groupingsResult.error) {
        throw groupingsResult.error;
      }
      if (subjectsResult.error) {
        throw subjectsResult.error;
      }

      const counts = new Map<string, number>();
      for (const subject of subjectsResult.data ?? []) {
        if (!subject.groupingId) {
          continue;
        }
        counts.set(subject.groupingId, (counts.get(subject.groupingId) ?? 0) + 1);
      }

      return (groupingsResult.data ?? []).map((grouping) => ({
        id: grouping.id,
        nameEn: grouping.nameEn,
        nameFr: grouping.nameFr,
        code: grouping.code,
        sortOrder: grouping.sortOrder,
        subjectCount: counts.get(grouping.id) ?? 0,
      }));
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
