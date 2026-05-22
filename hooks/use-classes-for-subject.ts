'use client';

import { useQuery } from '@tanstack/react-query';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import {
  subjectMatchesClass,
  type ClassSubjectEligibilityClass,
  type ClassSubjectEligibilitySubject,
} from '@/lib/acadia/class-subject-eligibility';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchSubjectClassAssignments } from '@/lib/supabase/queries/class-subjects';
import { fetchSubjectLevelIds } from '@/lib/supabase/queries/subject-levels';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type ClassForSubjectOption = {
  id: string;
  name: string;
  levelId: string;
  levelName: string | null;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  status: string;
  assignment: {
    subBranchIds: string[] | null;
    groupingId: string | null;
  } | null;
};

export function useClassesForSubject(filters: {
  subjectId?: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  levelIds: string[];
  academicYearId?: string | null;
  subject?: ClassSubjectEligibilitySubject | null;
}) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const subjectId = filters.subjectId?.trim() ?? '';

  return useQuery({
    queryKey: [
      'classes-for-subject',
      tenantId,
      subjectId,
      filters.subSystem,
      filters.branch,
      filters.levelIds,
      filters.academicYearId ?? null,
    ],
    queryFn: async (): Promise<ClassForSubjectOption[]> => {
      const supabase = requireBrowserClient();

      let subject = filters.subject;
      if (!subject && subjectId) {
        const { data: subjectRow, error: subjectError } = await supabase
          .from('Subject')
          .select(
            `
            id,
            subSystem,
            branch,
            levelId,
            academicYearId,
            termId,
            deactivatedAt,
            Term!Subject_semesterId_tenantId_fkey ( academicYearId )
          `,
          )
          .eq('tenantId', tenantId!)
          .eq('id', subjectId)
          .maybeSingle();

        if (subjectError) {
          throw subjectError;
        }
        if (!subjectRow) {
          return [];
        }

        const levelIds = await fetchSubjectLevelIds(supabase, tenantId!, subjectId);
        subject = {
          id: subjectRow.id as string,
          subSystem: subjectRow.subSystem as AcademicSubSystem,
          branch: subjectRow.branch as AcademicBranch,
          levelId: subjectRow.levelId as string,
          levelIds: levelIds.length > 0 ? levelIds : [subjectRow.levelId as string],
          academicYearId: subjectRow.academicYearId as string | null,
          termId: subjectRow.termId as string | null,
          deactivatedAt: subjectRow.deactivatedAt as string | null,
          Term: subjectRow.Term as ClassSubjectEligibilitySubject['Term'],
        };
      }

      if (!subject) {
        return [];
      }

      const { data: classes, error } = await supabase
        .from('Class')
        .select(
          `
          id,
          name,
          levelId,
          subSystem,
          branch,
          status,
          Level!Class_levelId_tenantId_fkey ( name, number )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('subSystem', filters.subSystem)
        .eq('branch', filters.branch)
        .eq('status', 'ACTIVE')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      const assignments = subjectId
        ? await fetchSubjectClassAssignments(supabase, tenantId!, subjectId)
        : [];
      const assignmentByClassId = new Map(
        assignments.map((row) => [row.classId, row]),
      );

      const options: ClassForSubjectOption[] = [];

      for (const row of classes ?? []) {
        const classRow: ClassSubjectEligibilityClass = {
          id: row.id as string,
          levelId: row.levelId as string,
          subSystem: row.subSystem as AcademicSubSystem,
          branch: row.branch as AcademicBranch,
        };

        if (
          !subjectMatchesClass(subject, classRow, {
            academicYearId: filters.academicYearId,
          })
        ) {
          continue;
        }

        const levelRel = row.Level;
        const level = Array.isArray(levelRel) ? levelRel[0] : levelRel;
        const levelName =
          (level as { name?: string | null; number?: number | null } | null)?.name?.trim() ||
          ((level as { number?: number | null } | null)?.number
            ? `Level ${(level as { number?: number }).number}`
            : null);

        const assignment = assignmentByClassId.get(row.id as string);

        options.push({
          id: row.id as string,
          name: row.name as string,
          levelId: row.levelId as string,
          levelName,
          subSystem: row.subSystem as AcademicSubSystem,
          branch: row.branch as AcademicBranch,
          status: row.status as string,
          assignment: assignment
            ? {
                subBranchIds: assignment.subBranchIds,
                groupingId: assignment.groupingId,
              }
            : null,
        });
      }

      return options;
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      subjectId.length > 0,
  });
}
