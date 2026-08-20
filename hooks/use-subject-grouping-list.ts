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
  inactiveSubjectCount: number;
  classOverrideCount: number;
};

export function useSubjectGroupingList() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['subject-grouping-list', tenantId],
    queryFn: async (): Promise<SubjectGroupingListRow[]> => {
      const supabase = requireBrowserClient();
      const [groupingsResult, subjectsResult, classOverridesResult] = await Promise.all([
        supabase
          .from('SubjectGrouping')
          .select('id, nameEn, nameFr, code, sortOrder')
          .eq('tenantId', tenantId!)
          .order('sortOrder', { ascending: true })
          .order('nameEn', { ascending: true }),
        supabase
          .from('Subject')
          .select('groupingId, deactivatedAt')
          .eq('tenantId', tenantId!),
        supabase
          .from('ClassSubject')
          .select('groupingId')
          .eq('tenantId', tenantId!)
          .not('groupingId', 'is', null),
      ]);

      if (groupingsResult.error) {
        throw groupingsResult.error;
      }
      if (subjectsResult.error) {
        throw subjectsResult.error;
      }

      if (classOverridesResult.error) {
        throw classOverridesResult.error;
      }

      const activeCounts = new Map<string, number>();
      const inactiveCounts = new Map<string, number>();
      for (const subject of subjectsResult.data ?? []) {
        if (!subject.groupingId) {
          continue;
        }
        if (subject.deactivatedAt) {
          inactiveCounts.set(
            subject.groupingId,
            (inactiveCounts.get(subject.groupingId) ?? 0) + 1,
          );
        } else {
          activeCounts.set(
            subject.groupingId,
            (activeCounts.get(subject.groupingId) ?? 0) + 1,
          );
        }
      }

      const overrideCounts = new Map<string, number>();
      for (const row of classOverridesResult.data ?? []) {
        if (!row.groupingId) {
          continue;
        }
        overrideCounts.set(row.groupingId, (overrideCounts.get(row.groupingId) ?? 0) + 1);
      }

      return (groupingsResult.data ?? []).map((grouping) => ({
        id: grouping.id,
        nameEn: grouping.nameEn,
        nameFr: grouping.nameFr,
        code: grouping.code,
        sortOrder: grouping.sortOrder,
        subjectCount: activeCounts.get(grouping.id) ?? 0,
        inactiveSubjectCount: inactiveCounts.get(grouping.id) ?? 0,
        classOverrideCount: overrideCounts.get(grouping.id) ?? 0,
      }));
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
