'use client';

import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  ALL_GUARDIANS_TARGET,
  resolveAlertRecipients,
  type AlertGroupMemberRow,
  type EnrollmentClassRow,
  type GuardianStudentLinkRow,
} from '@/lib/acadia/alerts';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';

export type AlertTargetOption = {
  key: string;
  label: string;
  count: number;
  kind: 'all' | 'class' | 'group';
  description?: string;
};

export function useAlertTargets() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useQuery<{ options: AlertTargetOption[]; academicYearId: string | null }>({
    queryKey: ['alert-targets', tenantId, activeYearId],
    queryFn: async () => {
      if (!tenantId) {
        return { options: [], academicYearId: null };
      }
      const supabase = requireBrowserClient();
      const [linksResult, enrollmentsResult, classesResult, groupsResult, membersResult] =
        await Promise.all([
          supabase
            .from('GuardianStudentLink')
            .select('guardianUserId, studentProfileId')
            .eq('tenantId', tenantId)
            .is('consentRevokedAt', null),
          activeYearId
            ? supabase
                .from('StudentEnrollment')
                .select('studentProfileId, classId')
                .eq('tenantId', tenantId)
                .eq('academicYearId', activeYearId)
                .eq('status', 'ENROLLED')
            : Promise.resolve({ data: [], error: null }),
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
          supabase
            .from('SchoolAlertGroupMember')
            .select('groupId, guardianUserId')
            .eq('tenantId', tenantId),
        ]);

      if (linksResult.error) {
        throw linksResult.error;
      }
      if (enrollmentsResult.error) {
        throw enrollmentsResult.error;
      }
      if (classesResult.error) {
        throw classesResult.error;
      }
      if (groupsResult.error) {
        throw groupsResult.error;
      }
      if (membersResult.error) {
        throw membersResult.error;
      }

      const links = (linksResult.data ?? []) as GuardianStudentLinkRow[];
      const enrollments = (enrollmentsResult.data ?? []) as EnrollmentClassRow[];
      const groupMembers = (membersResult.data ?? []) as AlertGroupMemberRow[];

      const allCount = resolveAlertRecipients(
        [{ kind: 'all' }],
        links,
        enrollments,
        groupMembers,
      ).length;

      const options: AlertTargetOption[] = [
        {
          key: ALL_GUARDIANS_TARGET,
          label: 'All guardians',
          count: allCount,
          kind: 'all',
        },
      ];

      for (const row of classesResult.data ?? []) {
        const classId = row.id as string;
        const count = resolveAlertRecipients(
          [{ kind: 'class', classId }],
          links,
          enrollments,
          groupMembers,
        ).length;
        options.push({
          key: `class:${classId}`,
          label: String(row.name ?? classId),
          count,
          kind: 'class',
        });
      }

      for (const row of groupsResult.data ?? []) {
        const groupId = row.id as string;
        const count = resolveAlertRecipients(
          [{ kind: 'group', groupId }],
          links,
          enrollments,
          groupMembers,
        ).length;
        options.push({
          key: `group:${groupId}`,
          label: String(row.name ?? groupId),
          count,
          kind: 'group',
          description: (row.description as string | null) ?? undefined,
        });
      }

      return { options, academicYearId: activeYearId };
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
