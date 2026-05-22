'use client';

import { useQuery } from '@tanstack/react-query';
import type { MilestoneRecord } from '@/lib/acadia/calendar-milestones';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type AcademicCalendarContext = {
  milestones: MilestoneRecord[];
  enrollmentOpensAt: string | null;
  enrollmentClosesAt: string | null;
};

export function useAcademicCalendarMilestones(academicYearId: string | null | undefined) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const yearId = academicYearId?.trim() ?? '';

  return useQuery({
    queryKey: ['academic-calendar-milestones', tenantId, yearId],
    queryFn: async (): Promise<AcademicCalendarContext> => {
      const supabase = requireBrowserClient();

      const [milestonesResult, yearResult] = await Promise.all([
        supabase
          .from('AcademicCalendarMilestone')
          .select('kind, onDate, termId, labelEn, labelFr')
          .eq('tenantId', tenantId!)
          .eq('academicYearId', yearId)
          .order('onDate', { ascending: true }),
        supabase
          .from('AcademicYear')
          .select('enrollmentOpensAt, enrollmentClosesAt')
          .eq('tenantId', tenantId!)
          .eq('id', yearId)
          .maybeSingle(),
      ]);

      if (milestonesResult.error) {
        throw milestonesResult.error;
      }
      if (yearResult.error) {
        throw yearResult.error;
      }

      return {
        milestones: (milestonesResult.data ?? []) as MilestoneRecord[],
        enrollmentOpensAt: yearResult.data?.enrollmentOpensAt ?? null,
        enrollmentClosesAt: yearResult.data?.enrollmentClosesAt ?? null,
      };
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      yearId.length > 0,
  });
}
