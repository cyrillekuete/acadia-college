'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import {
  EMPTY_CATALOG_FILTERS,
  branchLabel,
  levelDisplayLabel,
  rowMatchesCatalogFilters,
  subSystemLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { unwrapRelation } from '@/lib/acadia/record-display';

type Row = Record<string, unknown> & {
  number: number;
  labelEn?: string | null;
  labelFr?: string | null;
  sortOrder?: number | null;
  Specialty?: unknown;
};

export default function LevelsPage() {
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'level',
        header: 'Level',
        cell: ({ row }) =>
          levelDisplayLabel({
            number: row.original.number,
            labelEn: row.original.labelEn,
            labelFr: row.original.labelFr,
          }),
      },
      { accessorKey: 'number', header: '#' },
      { accessorKey: 'sortOrder', header: 'Order' },
      {
        id: 'specialty',
        header: 'Specialty',
        cell: ({ row }) => {
          const specialty = unwrapRelation<{ code?: string; nameEn?: string }>(
            row.original.Specialty,
          );
          return specialty?.code ?? specialty?.nameEn ?? '—';
        },
      },
      {
        id: 'subSystem',
        header: 'Sub-system',
        cell: ({ row }) => {
          const specialty = unwrapRelation<{ subSystem?: string }>(
            row.original.Specialty,
          );
          return subSystemLabel(specialty?.subSystem);
        },
      },
      {
        id: 'branch',
        header: 'Branch',
        cell: ({ row }) => {
          const specialty = unwrapRelation<{ branch?: string }>(row.original.Specialty);
          return branchLabel(specialty?.branch);
        },
      },
    ],
    [],
  );

  return (
    <AcadiaPageShell
      title="Acadia College — Levels"
      description="Class levels per specialty (Form 1–5 / Sixième–Terminale depending on sub-system)."
    >
      <CatalogFilterBar filters={catalogFilters} onChange={setCatalogFilters} />
      <SupabaseTableList
        table="Level"
        title="Levels"
        select="id, number, labelEn, labelFr, sortOrder, specialtyId, Specialty:specialtyId ( code, nameEn, subSystem, branch )"
        columns={columns}
        searchKeys={['labelEn', 'labelFr']}
        rowFilter={(row) => rowMatchesCatalogFilters(row, catalogFilters)}
      />
    </AcadiaPageShell>
  );
}
