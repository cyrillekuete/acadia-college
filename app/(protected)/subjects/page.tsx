'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { SubjectsTable } from '@/components/acadia/subjects/subjects-table';
import { Button } from '@/components/ui/button';
import {
  EMPTY_CATALOG_FILTERS,
  type CatalogFilters,
} from '@/lib/acadia/education-system';

export default function SubjectsPage() {
  const router = useRouter();
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);

  return (
    <AcadiaPageShell
      title="Acadia College — Subjects"
      description="Subject catalog with type, coefficient, optional groupings, and sub-branches."
    >
      <CatalogFilterBar filters={catalogFilters} onChange={setCatalogFilters} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/subjects/groupings">Manage groupings</Link>
        </Button>
        <AdminToolbar
          className="mb-0"
          addLabel="New subject"
          onAdd={() => router.push('/subjects/new')}
        />
      </div>

      <SubjectsTable filters={catalogFilters} />
    </AcadiaPageShell>
  );
}
