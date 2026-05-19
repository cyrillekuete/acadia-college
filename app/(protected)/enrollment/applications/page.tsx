'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { detailLinkColumn } from '@/lib/acadia/list-columns';
import {
  EMPTY_CATALOG_FILTERS,
  rowMatchesCatalogFilters,
  specialtyStreamLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { applicantDisplayName } from '@/lib/acadia/enrollment';

type Row = Record<string, unknown> & {
  id: string;
  status?: string;
  kind?: string;
  subSystem?: string | null;
  branch?: string | null;
  firstNameEn?: string;
  lastNameEn?: string;
  firstNameFr?: string | null;
  lastNameFr?: string | null;
  Specialty?: unknown;
};

export default function EnrollmentApplicationsPage() {
  const router = useRouter();
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'applicant',
        header: 'Applicant',
        cell: ({ row }) => (
          <Link
            href={`/enrollment/applications/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {applicantDisplayName(
              row.original.firstNameEn,
              row.original.lastNameEn,
              row.original.firstNameFr,
              row.original.lastNameFr,
            )}
          </Link>
        ),
      },
      { accessorKey: 'kind', header: 'Kind' },
      { accessorKey: 'status', header: 'Status' },
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
      <AdminToolbar
        addLabel="New application"
        onAdd={() => router.push('/enrollment/applications/new')}
      />
      <CatalogFilterBar filters={catalogFilters} onChange={setCatalogFilters} />
      <SupabaseTableList
        table="EnrollmentApplication"
        title="Applications"
        select="id, status, kind, firstNameEn, lastNameEn, firstNameFr, lastNameFr, subSystem, branch, createdAt, specialtyId, Specialty:specialtyId ( subSystem, branch )"
        columns={columns}
        searchKeys={['status', 'kind', 'lastNameEn', 'firstNameEn']}
        rowFilter={(row) => rowMatchesCatalogFilters(row, catalogFilters)}
      />
    </AcadiaPageShell>
  );
}
