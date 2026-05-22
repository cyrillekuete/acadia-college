'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Settings } from '@/lib/icons';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EMPTY_CATALOG_FILTERS,
  levelDisplayLabel,
  rowMatchesCatalogFilters,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { streamLabel, unwrapRelation } from '@/lib/acadia/record-display';
import { useLevelsForStream } from '@/hooks/use-enrollment-catalog-options';

type Row = Record<string, unknown> & {
  id: string;
  status?: string;
  academicYearId?: string;
  subSystem?: string;
  branch?: string;
  levelId?: string;
  StudentProfile?: unknown;
  AcademicYear?: unknown;
  Level?: unknown;
};

export default function ClassRostersPage() {
  const { activeYearId } = useActiveAcademicYear();
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [levelId, setLevelId] = useState('');

  const subSystem = catalogFilters.subSystem ?? 'ENGLISH';
  const branch = catalogFilters.branch ?? 'GRAMMAR';

  const { data: levels = [] } = useLevelsForStream(subSystem, branch);

  useEffect(() => {
    if (levelId && !levels.some((l) => l.id === levelId)) {
      setLevelId('');
    }
  }, [subSystem, branch, levels, levelId]);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'student',
        header: 'Student',
        cell: ({ row }) => {
          const profile = unwrapRelation<{ id?: string; registrationNumber?: string }>(
            row.original.StudentProfile,
          );
          const studentId = profile?.registrationNumber ?? '—';
          if (!profile?.id) {
            return studentId;
          }
          return (
            <Link
              href={`/students/${profile.id}`}
              className="font-medium text-primary hover:underline"
            >
              {studentId}
            </Link>
          );
        },
      },
      {
        id: 'stream',
        header: 'Stream',
        cell: ({ row }) =>
          streamLabel(row.original.subSystem as string, row.original.branch as string),
      },
      {
        id: 'level',
        header: 'Level',
        cell: ({ row }) => levelDisplayLabel(unwrapRelation(row.original.Level)),
      },
      { accessorKey: 'status', header: 'Status' },
    ],
    [],
  );

  const rowFilter = (row: Row) => {
    if (!rowMatchesCatalogFilters(row, catalogFilters)) {
      return false;
    }
    if (levelId && row.levelId !== levelId) {
      return false;
    }
    return true;
  };

  return (
    <AcadiaPageShell
      title="Acadia College — Class rosters"
      description="Students enrolled by academic year, sub-system, branch, and level."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
        <CurrentAcademicYearBadge />
        <CatalogFilterBar filters={catalogFilters} onChange={setCatalogFilters} />
        <Select
          value={levelId || '__all__'}
          onValueChange={(value) => setLevelId(value === '__all__' ? '' : value)}
          disabled={!subSystem || !branch}
        >
          <SelectTrigger className="w-[180px]" aria-label="Level filter">
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All levels</SelectItem>
            {levels.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {levelDisplayLabel(level)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href="/academics/classes">
            <Settings className="size-4" />
            Manage class structure
          </Link>
        </Button>
      </div>

      <SupabaseTableList scopeByAcademicYear
        table="StudentEnrollment"
        title="Class roster"
        select="id, status, academicYearId, subSystem, branch, levelId, StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey ( id, registrationNumber ), AcademicYear!StudentEnrollment_academicYearId_tenantId_fkey ( label ), Level!StudentEnrollment_levelId_tenantId_fkey ( number, name, labelEn )"
        columns={columns}
        searchKeys={['status']}
        rowFilter={rowFilter}
      />
    </AcadiaPageShell>
  );
}
