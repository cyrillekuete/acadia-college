'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import {
  EMPTY_CATALOG_FILTERS,
  rowMatchesCatalogFilters,
  specialtyStreamLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { detailLinkColumn } from '@/lib/acadia/list-columns';

type Row = { id: string; code?: string; Specialty?: unknown } & Record<string, unknown>;

export default function CoursesPage() {
  const router = useRouter();
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      detailLinkColumn<Row>('/courses', 'code', 'Code'),
      { accessorKey: 'nameEn', header: 'Name (EN)' },
      { accessorKey: 'nameFr', header: 'Name (FR)' },
      { accessorKey: 'credits', header: 'Credits' },
      {
        id: 'stream',
        header: 'Sub-system / branch',
        cell: ({ row }) => {
          const specialty = row.original.Specialty;
          const rel = Array.isArray(specialty) ? specialty[0] : specialty;
          if (rel && typeof rel === 'object') {
            const s = rel as { subSystem?: string; branch?: string };
            return specialtyStreamLabel(s.subSystem, s.branch);
          }
          return '—';
        },
      },
    ],
    [],
  );

  return (
    <AcadiaPageShell
      title="Acadia College — Courses"
      description="Course catalog filtered by specialty sub-system and branch."
    >
      <AdminToolbar
        addLabel="New course"
        onAdd={() => router.push('/courses/new')}
      />
      <CatalogFilterBar filters={catalogFilters} onChange={setCatalogFilters} />
      <SupabaseTableList
        table="Course"
        title="Courses"
        select="id, code, nameEn, nameFr, credits, hours, specialtyId, Specialty:specialtyId ( subSystem, branch )"
        columns={columns}
        searchKeys={['code', 'nameEn', 'nameFr']}
        rowFilter={(row) => rowMatchesCatalogFilters(row, catalogFilters)}
      />
    </AcadiaPageShell>
  );
}
