'use client';

import { useQuery } from '@tanstack/react-query';
import { formatSubjectLevelsLabel, unwrapRelation } from '@/lib/acadia/record-display';
import { normalizeSubjectName } from '@/lib/acadia/subject-variants';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type SubjectSibling = {
  id: string;
  code: string;
  nameEn: string;
  levelsLabel: string;
};

export function useSubjectSiblings(input: {
  subjectId?: string;
  nameEn?: string;
  subSystem?: string | null;
  branch?: string | null;
  academicYearId?: string | null;
}) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const enabled =
    isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
    !!input.subjectId &&
    !!input.nameEn &&
    !!input.subSystem &&
    !!input.branch &&
    !!input.academicYearId;

  return useQuery({
    queryKey: [
      'subject-siblings',
      tenantId,
      input.subjectId,
      input.nameEn,
      input.subSystem,
      input.branch,
      input.academicYearId,
    ],
    queryFn: async (): Promise<SubjectSibling[]> => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('Subject')
        .select(
          `
          id,
          code,
          nameEn,
          Level!Subject_levelId_tenantId_fkey ( labelEn, number ),
          SubjectLevel (
            levelId,
            Level!SubjectLevel_levelId_tenantId_fkey ( labelEn, number )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', input.academicYearId!)
        .eq('subSystem', input.subSystem!)
        .eq('branch', input.branch!)
        .neq('id', input.subjectId!);

      if (error) {
        throw error;
      }

      const expected = normalizeSubjectName(input.nameEn ?? '');
      return (data ?? [])
        .filter((row) => normalizeSubjectName(row.nameEn as string) === expected)
        .map((row) => {
          const primary = unwrapRelation<{ labelEn?: string | null; number?: number }>(
            row.Level,
          );
          const extras = Array.isArray(row.SubjectLevel)
            ? row.SubjectLevel.map((level) =>
                unwrapRelation<{ labelEn?: string | null; number?: number }>(level.Level),
              ).filter((level): level is NonNullable<typeof level> => level != null)
            : [];
          return {
            id: row.id as string,
            code: row.code as string,
            nameEn: row.nameEn as string,
            levelsLabel: formatSubjectLevelsLabel(primary, extras),
          };
        });
    },
    enabled,
  });
}
