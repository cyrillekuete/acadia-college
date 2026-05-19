'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import {
  EMPTY_CATALOG_FILTERS,
  branchLabel,
  rowMatchesCatalogFilters,
  subSystemLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';

type Row = Record<string, unknown> & {
  subSystem?: string;
  branch?: string;
};

export default function SpecialtiesPage() {
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'code', header: 'Code' },
      { accessorKey: 'nameEn', header: 'Name (EN)' },
      { accessorKey: 'nameFr', header: 'Name (FR)' },
      {
        accessorKey: 'subSystem',
        header: 'Sub-system',
        cell: ({ row }) => subSystemLabel(row.original.subSystem),
      },
      {
        accessorKey: 'branch',
        header: 'Branch',
        cell: ({ row }) => branchLabel(row.original.branch),
      },
    ],
    [],
  );

  return (
    <AcadiaPageShell
      title="Acadia College — Specialties"
      description="Programs by Cameroon sub-system (English/French) and branch (Grammar, Technical, Commercial)."
    >
      <CatalogFilterBar filters={catalogFilters} onChange={setCatalogFilters} />
      <SupabaseTableList
        table="Specialty"
        title="Specialties"
        select="id, code, nameEn, nameFr, subSystem, branch"
        columns={columns}
        searchKeys={['code', 'nameEn']}
        rowFilter={(row) => rowMatchesCatalogFilters(row, catalogFilters)}
      />
    </AcadiaPageShell>
  );
}
