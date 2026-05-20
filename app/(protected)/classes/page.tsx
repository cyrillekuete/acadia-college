'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
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
  specialtyStreamLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { specialtyLabel, unwrapRelation } from '@/lib/acadia/record-display';
import {
  useLevelsForSpecialty,
  useSpecialtyOptions,
} from '@/hooks/use-enrollment-catalog-options';

type Row = Record<string, unknown> & {
  id: string;
  status?: string;
  academicYearId?: string;
  specialtyId?: string;
  levelId?: string;
  StudentProfile?: unknown;
  AcademicYear?: unknown;
  Specialty?: unknown;
  Level?: unknown;
};

export default function ClassRostersPage() {
  const { activeYearId } = useActiveAcademicYear();
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [specialtyId, setSpecialtyId] = useState('');
  const [levelId, setLevelId] = useState('');

  const subSystem = catalogFilters.subSystem ?? 'ENGLISH';
  const branch = catalogFilters.branch ?? 'GRAMMAR';

  const { data: specialties = [] } = useSpecialtyOptions(subSystem, branch);
  const { data: levels = [] } = useLevelsForSpecialty(specialtyId, subSystem, branch);

  useEffect(() => {
    if (specialtyId && !specialties.some((s) => s.id === specialtyId)) {
      setSpecialtyId('');
      setLevelId('');
    }
  }, [subSystem, branch, specialties, specialtyId]);

  useEffect(() => {
    if (levelId && !levels.some((l) => l.id === levelId)) {
      setLevelId('');
    }
  }, [specialtyId, levels, levelId]);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'student',
        header: 'Student',
        cell: ({ row }) => {
          const profile = unwrapRelation<{ id?: string; registrationNumber?: string }>(
            row.original.StudentProfile,
          );
          const matricule = profile?.registrationNumber ?? '—';
          if (!profile?.id) {
            return matricule;
          }
          return (
            <Link
              href={`/students/${profile.id}`}
              className="font-medium text-primary hover:underline"
            >
              {matricule}
            </Link>
          );
        },
      },
      {
        id: 'stream',
        header: 'Sub-system / branch',
        cell: ({ row }) => {
          const specialty = unwrapRelation<{
            subSystem?: string;
            branch?: string;
          }>(row.original.Specialty);
          return specialtyStreamLabel(specialty?.subSystem, specialty?.branch);
        },
      },
      {
        id: 'specialty',
        header: 'Specialty',
        cell: ({ row }) => specialtyLabel(unwrapRelation(row.original.Specialty)),
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
    if (specialtyId && row.specialtyId !== specialtyId) {
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
      description="Students enrolled by academic year, sub-system, branch, specialty, and level."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <CurrentAcademicYearBadge />
        <CatalogFilterBar filters={catalogFilters} onChange={setCatalogFilters} />
        <Select
          value={specialtyId || '__all__'}
          onValueChange={(value) => {
            setSpecialtyId(value === '__all__' ? '' : value);
            setLevelId('');
          }}
        >
          <SelectTrigger className="w-[220px]" aria-label="Specialty filter">
            <SelectValue placeholder="All specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All specialties</SelectItem>
            {specialties.map((spec) => (
              <SelectItem key={spec.id} value={spec.id}>
                {spec.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={levelId || '__all__'}
          onValueChange={(value) => setLevelId(value === '__all__' ? '' : value)}
          disabled={!specialtyId}
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

      <SupabaseTableList scopeByAcademicYear
        table="StudentEnrollment"
        title="Class roster"
        select="id, status, academicYearId, specialtyId, levelId, StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey ( id, registrationNumber ), AcademicYear!StudentEnrollment_academicYearId_tenantId_fkey ( label ), Specialty!StudentEnrollment_specialtyId_tenantId_fkey ( subSystem, branch, code, nameEn ), Level!StudentEnrollment_levelId_tenantId_fkey ( number, name, labelEn )"
        columns={columns}
        searchKeys={['status']}
        rowFilter={rowFilter}
      />
    </AcadiaPageShell>
  );
}
