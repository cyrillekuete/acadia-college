'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { EMPTY_CATALOG_FILTERS } from '@/lib/acadia/education-system';
import { localizedText } from '@/lib/acadia/locale';
import { levelLabel } from '@/lib/acadia/record-display';
import { buildAdminSchemeCatalog } from '@/lib/acadia/scheme-of-work';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  fetchSchemeDetailById,
  fetchSchemesForSubjectYear,
  fetchSchemesForYear,
  fetchSchemeTopicsWithProgress,
  fetchStudentSchemeListItems,
  fetchSubjectLevelsForSchemePicker,
  fetchTeacherSchemeListItems,
  fetchTermsForAcademicYear,
} from '@/lib/supabase/queries/scheme-of-work';
import { useSubjectList } from '@/hooks/use-subject-list';

export function useSchemeSubjectOptions() {
  return useSubjectList(EMPTY_CATALOG_FILTERS);
}

export function useSubjectLevelsForScheme(subjectId: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['scheme-of-work-subject-levels', tenantId, subjectId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchSubjectLevelsForSchemePicker(supabase, tenantId!, subjectId!);
    },
    enabled:
      !!subjectId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useSchemeTerms(academicYearId: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['scheme-of-work-terms', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchTermsForAcademicYear(supabase, tenantId!, academicYearId!);
    },
    enabled:
      !!academicYearId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useSchemeDetail(schemeId: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['scheme-of-work-detail', tenantId, schemeId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchSchemeDetailById(supabase, tenantId!, schemeId!);
    },
    enabled:
      !!schemeId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useSchemeTopics(schemeId: string | null, classId?: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['scheme-of-work-topics', tenantId, schemeId, classId ?? null],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchSchemeTopicsWithProgress(
        supabase,
        tenantId!,
        schemeId!,
        classId,
      );
    },
    enabled:
      !!schemeId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useTeacherSchemeList() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const profileQuery = useLinkedAcadiaProfile();
  const staffProfileId = profileQuery.data?.staffProfileId ?? null;

  return useQuery({
    queryKey: ['scheme-of-work-teacher-list', tenantId, activeYearId, staffProfileId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchTeacherSchemeListItems(
        supabase,
        tenantId!,
        activeYearId!,
        staffProfileId!,
      );
    },
    enabled:
      !!activeYearId &&
      !!staffProfileId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}

export function useStudentSchemeList() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const profileQuery = useLinkedAcadiaProfile({ includeEnrollment: true });
  const classId = profileQuery.data?.enrollment?.classId ?? null;

  const listQuery = useQuery({
    queryKey: ['scheme-of-work-student-list', tenantId, activeYearId, classId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchStudentSchemeListItems(
        supabase,
        tenantId!,
        activeYearId!,
        classId!,
      );
    },
    enabled:
      !!activeYearId &&
      !!classId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  return {
    ...listQuery,
    classId,
    enrollment: profileQuery.data?.enrollment ?? null,
    profileLoading: profileQuery.isLoading,
    profileError: profileQuery.isError,
  };
}

export function useAdminSchemeCatalog() {
  const subjectsQuery = useSchemeSubjectOptions();
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  const schemesQuery = useQuery({
    queryKey: ['scheme-of-work-year', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchSchemesForYear(supabase, tenantId!, activeYearId!);
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  const catalog = useMemo(() => {
    const subjects = (subjectsQuery.data ?? []).map((subject) => {
      const subjectLevels = subject.SubjectLevel ?? [];
      const levels =
        subjectLevels.length > 0
          ? subjectLevels.map((row) => ({
              levelId: row.levelId,
              levelName: levelLabel(row.Level ?? null),
            }))
          : subject.levelId
            ? [
                {
                  levelId: subject.levelId,
                  levelName: levelLabel(subject.Level ?? null),
                },
              ]
            : [];

      return {
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName:
          localizedText(subject.nameEn, subject.nameFr) || subject.nameEn,
        deactivatedAt: subject.deactivatedAt,
        levels,
      };
    });

    return buildAdminSchemeCatalog(subjects, schemesQuery.data ?? []);
  }, [subjectsQuery.data, schemesQuery.data]);

  return {
    catalog,
    isLoading: subjectsQuery.isLoading || schemesQuery.isLoading,
    isError: subjectsQuery.isError || schemesQuery.isError,
  };
}

export function useSubjectYearSchemes(subjectId: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  return useQuery({
    queryKey: ['scheme-of-work-subject-year', tenantId, activeYearId, subjectId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchSchemesForSubjectYear(
        supabase,
        tenantId!,
        activeYearId!,
        subjectId!,
      );
    },
    enabled:
      !!subjectId &&
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
