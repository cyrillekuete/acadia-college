'use client';

import { useQuery } from '@tanstack/react-query';
import type { SubjectType } from '@/lib/acadia/subject-catalog';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { rowMatchesCatalogFilters, type CatalogFilters } from '@/lib/acadia/education-system';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type SubjectSubBranchRow = {
  id: string;
  name: string;
  nameFr: string | null;
  coefficient: number;
  sortOrder: number;
};

export type SubjectListRow = {
  id: string;
  code: string;
  nameEn: string;
  nameFr: string;
  subjectType: SubjectType;
  coefficient: number;
  hasSubBranches: boolean;
  deactivatedAt: string | null;
  specialtyId: string;
  Specialty?: { subSystem?: AcademicSubSystem; branch?: AcademicBranch } | null;
  SubjectGrouping?: { nameEn?: string; nameFr?: string } | null;
  SubjectSubBranch?: SubjectSubBranchRow[] | null;
};

export type SubjectListRowView = SubjectListRow & {
  subSystem?: AcademicSubSystem;
  branch?: AcademicBranch;
  Specialty: { subSystem?: AcademicSubSystem; branch?: AcademicBranch } | null;
  SubjectGrouping: { nameEn?: string; nameFr?: string } | null;
  SubjectSubBranch: SubjectSubBranchRow[];
};

export function useSubjectList(filters: CatalogFilters) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['subject-list', tenantId, filters.subSystem, filters.branch],
    queryFn: async (): Promise<SubjectListRowView[]> => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('Subject')
        .select(
          `
          id,
          code,
          nameEn,
          nameFr,
          subjectType,
          coefficient,
          hasSubBranches,
          deactivatedAt,
          specialtyId,
          Specialty:specialtyId ( subSystem, branch ),
          SubjectGrouping:groupingId ( nameEn, nameFr ),
          SubjectSubBranch ( id, name, nameFr, coefficient, sortOrder )
        `,
        )
        .eq('tenantId', tenantId!)
        .order('nameEn', { ascending: true });

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as SubjectListRow[];
      return rows
        .map((row): SubjectListRowView => {
          const specialty = unwrapRelation<{
            subSystem?: AcademicSubSystem;
            branch?: AcademicBranch;
          }>(row.Specialty);
          const grouping = unwrapRelation<{ nameEn?: string; nameFr?: string }>(
            row.SubjectGrouping,
          );
          const subBranches = Array.isArray(row.SubjectSubBranch)
            ? [...row.SubjectSubBranch].sort((a, b) => a.sortOrder - b.sortOrder)
            : [];
          return {
            ...row,
            Specialty: specialty,
            SubjectGrouping: grouping,
            SubjectSubBranch: subBranches,
            subSystem: specialty?.subSystem,
            branch: specialty?.branch,
          };
        })
        .filter((row) => rowMatchesCatalogFilters(row, filters));
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
