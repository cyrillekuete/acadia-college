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
  specialtyStreamLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';

type Row = Record<string, unknown> & {
  status?: string;
  kind?: string;
  subSystem?: string | null;
  branch?: string | null;
  Specialty?: unknown;
};

export default function EnrollmentApplicationsPage() {
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'kind', header: 'Kind' },
      { accessorKey: 'status', header: 'Status' },
      {
        accessorKey: 'lastNameEn',
        header: 'Applicant',
        cell: ({ row }) => {
          const last = String(row.original.lastNameEn ?? '').trim();
          const first = String(row.original.firstNameEn ?? '').trim();
          const name = [first, last].filter(Boolean).join(' ');
          return name || '—';
        },
      },
      {
        id: 'stream',
        header: 'Sub-system / branch',
        cell: ({ row }) =>
          specialtyStreamLabel(row.original.subSystem, row.original.branch),
      },
      {
        accessorKey: 'createdAt',
        header: 'Submitted',
        cell: ({ row }) => {
          const value = row.original.createdAt;
          if (!value) {
            return '—';
          }
          return new Date(String(value)).toLocaleDateString();
        },
      },
    ],
    [],
  );

  return (
    <AcadiaPageShell
      title="Acadia College — Enrollment applications"
      description="Incoming applications filtered by English/French sub-system and academic branch."
    >
      <CatalogFilterBar filters={catalogFilters} onChange={setCatalogFilters} />
      <SupabaseTableList
        table="EnrollmentApplication"
        title="Applications"
        select="id, status, kind, firstNameEn, lastNameEn, subSystem, branch, createdAt, specialtyId, Specialty:specialtyId ( subSystem, branch )"
        columns={columns}
        searchKeys={['status', 'kind', 'lastNameEn', 'firstNameEn']}
        rowFilter={(row) => rowMatchesCatalogFilters(row, catalogFilters)}
      />
    </AcadiaPageShell>
  );
}
