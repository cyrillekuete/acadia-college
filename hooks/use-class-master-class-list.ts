'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { canWriteAcademicAdmin, isDisciplineMaster } from '@/lib/acadia/roles';
import {
  classMatchesDisciplineScopes,
  type DisciplineScopeClassLink,
  type DisciplineScopeGroup,
} from '@/lib/acadia/discipline-scopes';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchClassList, type ClassListRow } from '@/lib/supabase/queries/class-list';
import { fetchClassMasterAccessibleClassIds } from '@/lib/supabase/queries/class-report';

export function useClassMasterClassList() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const roleSlug = session?.roleSlugs ?? null;
  const admin = canWriteAcademicAdmin(roleSlug);
  const disciplineMaster = isDisciplineMaster(roleSlug);
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
      disciplineMaster,
    ],
    queryFn: async (): Promise<ClassListRow[]> => {
      if (!admin && !staffProfileId && !disciplineMaster) {
        return [];
      }
      const supabase = requireBrowserClient();
      const classes = await fetchClassList(supabase, tenantId!, activeYearId);
      if (admin) {
        return classes;
      }
      const allowed = new Set<string>();
      if (staffProfileId) {
        const classMasterIds = await fetchClassMasterAccessibleClassIds(
          supabase, tenantId!, activeYearId!, staffProfileId,
        );
        classMasterIds.forEach((id) => allowed.add(id));
      }
      if (disciplineMaster && session?.authUser?.id) {
        const [{ data: groups, error: groupsError }, { data: links, error: linksError }] = await Promise.all([
          supabase.from('DisciplineScopeGroup').select('id,wholeSchool,subSystem,branch,minLevel,maxLevel')
            .eq('tenantId', tenantId!).eq('staffUserId', session.authUser.id),
          supabase.from('DisciplineScopeClass').select('scopeGroupId,classId'),
        ]);
        if (groupsError) throw groupsError;
        if (linksError) throw linksError;
        const scoped = classes.filter((row) => classMatchesDisciplineScopes({
          id: row.id,
          subSystem: row.subSystem,
          branch: row.branch,
          levelNumber: row.Level?.number ?? null,
        }, (groups ?? []) as unknown as DisciplineScopeGroup[], (links ?? []) as unknown as DisciplineScopeClassLink[]));
        scoped.forEach((row) => allowed.add(row.id));
      }
      return classes.filter((row) => allowed.has(row.id));
    },
    staleTime: 60_000,
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      Boolean(activeYearId) &&
      (admin || linkedReady || disciplineMaster),
  });
}
