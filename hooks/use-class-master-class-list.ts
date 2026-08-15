'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { isAdmin } from '@/lib/acadia/roles';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchClassList, type ClassListRow } from '@/lib/supabase/queries/class-list';
import { fetchClassMasterClassIds } from '@/lib/supabase/queries/class-discipline';

export function useClassMasterClassList() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const roleSlug = session?.roleSlug ?? null;
  const admin = isAdmin(roleSlug);
  const { activeYearId } = useActiveAcademicYear();
  const { data: linked, isSuccess: linkedReady } = useLinkedAcadiaProfile();
  const staffProfileId = linked?.staffProfileId ?? null;

  return useQuery({
    queryKey: [
      'class-master-class-list',
      tenantId,
      activeYearId,
      admin,
      staffProfileId,
    ],
    queryFn: async (): Promise<ClassListRow[]> => {
      if (!admin && !staffProfileId) {
        return [];
      }
      const supabase = requireBrowserClient();
      const classes = await fetchClassList(supabase, tenantId!, activeYearId);
      if (admin) {
        return classes;
      }
      const allowed = new Set(
        await fetchClassMasterClassIds(supabase, tenantId!, staffProfileId!),
      );
      return classes.filter((row) => allowed.has(row.id));
    },
    staleTime: 60_000,
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      Boolean(activeYearId) &&
      (admin || linkedReady),
  });
}
