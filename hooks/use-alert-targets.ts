'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  ALL_GUARDIANS_TARGET,
  resolveAlertRecipients,
} from '@/lib/acadia/alerts';
import {
  canBroadcastAllGuardians,
  isAdmin,
  isStaffOrTeacher,
} from '@/lib/acadia/roles';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useTeacherStudents } from '@/hooks/use-teacher-students';
import { useTranslation } from '@/hooks/useTranslation';
import { fetchAlertAudience } from '@/lib/supabase/queries/alert-audience';
import { requireBrowserClient } from '@/lib/supabase/client';

export type AlertTargetOption = {
  key: string;
  label: string;
  count: number;
  kind: 'all' | 'class' | 'group';
  description?: string;
};

export function useAlertTargets() {
  const { t } = useTranslation();
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const canBroadcastAll = canBroadcastAllGuardians(session?.roleSlug);
  const teacherView =
    isStaffOrTeacher(session?.roleSlug) && !isAdmin(session?.roleSlug);
  const teacherStudents = useTeacherStudents();
  const allowedClassIds = canBroadcastAll
    ? null
    : (teacherStudents.data?.scope.classIds ?? []);
  const teacherScopeLoading = teacherView && teacherStudents.isLoading;

  return useQuery<{
    options: AlertTargetOption[];
    academicYearId: string | null;
    canBroadcastAll: boolean;
    allowedClassIds: string[] | null;
    hasAcademicYear: boolean;
  }>({
    queryKey: [
      'alert-targets',
      tenantId,
      activeYearId,
      canBroadcastAll,
      allowedClassIds?.slice().sort().join(',') ?? 'all',
    ],
    queryFn: async () => {
      if (!tenantId) {
        return {
          options: [],
          academicYearId: null,
          canBroadcastAll,
          allowedClassIds,
          hasAcademicYear: false,
        };
      }
      const supabase = requireBrowserClient();
      const [audience, classesResult, groupsResult] = await Promise.all([
        fetchAlertAudience(supabase, tenantId, activeYearId),
        supabase
          .from('Class')
          .select('id, name')
          .eq('tenantId', tenantId)
          .eq('status', 'ACTIVE')
          .order('name'),
        supabase
          .from('SchoolAlertGroup')
          .select('id, name, description')
          .eq('tenantId', tenantId)
          .order('name'),
      ]);

      if (classesResult.error) {
        throw classesResult.error;
      }
      if (groupsResult.error) {
        throw groupsResult.error;
      }

      const options: AlertTargetOption[] = [];
      if (canBroadcastAll) {
        options.push({
          key: ALL_GUARDIANS_TARGET,
          label: t('communication.allGuardiansLabel'),
          count: resolveAlertRecipients(
            [{ kind: 'all' }],
            audience.eligibleLinks,
            audience.enrollments,
            audience.activeGroupMembers,
          ).length,
          kind: 'all',
        });
      }

      const classAllow = allowedClassIds === null ? null : new Set(allowedClassIds);
      if (activeYearId) {
        for (const row of classesResult.data ?? []) {
          const classId = row.id as string;
          if (classAllow && !classAllow.has(classId)) {
            continue;
          }
          options.push({
            key: `class:${classId}`,
            label: String(row.name ?? classId),
            count: resolveAlertRecipients(
              [{ kind: 'class', classId }],
              audience.eligibleLinks,
              audience.enrollments,
              audience.activeGroupMembers,
            ).length,
            kind: 'class',
          });
        }
      }

      for (const row of groupsResult.data ?? []) {
        const groupId = row.id as string;
        options.push({
          key: `group:${groupId}`,
          label: String(row.name ?? groupId),
          count: resolveAlertRecipients(
            [{ kind: 'group', groupId }],
            audience.groupLinks,
            audience.enrollments,
            audience.activeGroupMembers,
          ).length,
          kind: 'group',
          description: (row.description as string | null) ?? undefined,
        });
      }

      return {
        options,
        academicYearId: activeYearId,
        canBroadcastAll,
        allowedClassIds,
        hasAcademicYear: Boolean(activeYearId),
      };
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      !teacherScopeLoading,
  });
}
