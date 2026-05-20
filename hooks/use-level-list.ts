'use client';

import { useQuery } from '@tanstack/react-query';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type LevelListRow = {
  id: string;
  name: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  number: number;
  sortOrder: number | null;
  createdAt: string;
  classCount: number;
};

export function useLevelList(filters?: {
  subSystem?: AcademicSubSystem | null;
  branch?: AcademicBranch | null;
}) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: [
      'level-list',
      tenantId,
      filters?.subSystem ?? null,
      filters?.branch ?? null,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('Level')
        .select('id, name, subSystem, branch, number, sortOrder, createdAt')
        .eq('tenantId', tenantId!)
        .order('sortOrder', { ascending: true })
        .order('number', { ascending: true });

      if (filters?.subSystem) {
        query = query.eq('subSystem', filters.subSystem);
      }
      if (filters?.branch) {
        query = query.eq('branch', filters.branch);
      }

      const { data: levels, error } = await query;
      if (error) {
        throw new Error(getQueryErrorMessage(error));
      }

      const rows = levels ?? [];
      if (rows.length === 0) {
        return [] as LevelListRow[];
      }

      const levelIds = rows.map((r) => r.id as string);
      const { data: classes, error: classError } = await supabase
        .from('Class')
        .select('levelId')
        .eq('tenantId', tenantId!)
        .in('levelId', levelIds);

      if (classError) {
        throw new Error(getQueryErrorMessage(classError));
      }

      const classCountByLevel = new Map<string, number>();
      for (const row of classes ?? []) {
        const levelId = row.levelId as string;
        if (levelId) {
          classCountByLevel.set(levelId, (classCountByLevel.get(levelId) ?? 0) + 1);
        }
      }

      return rows.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        subSystem: row.subSystem as AcademicSubSystem,
        branch: row.branch as AcademicBranch,
        number: row.number as number,
        sortOrder: (row.sortOrder as number | null) ?? null,
        createdAt: row.createdAt as string,
        classCount: classCountByLevel.get(row.id as string) ?? 0,
      }));
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
