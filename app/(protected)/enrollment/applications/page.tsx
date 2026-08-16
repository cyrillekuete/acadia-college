'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { ApplicationReviewSheet } from '@/components/acadia/enrollment/application-review-sheet';
import { EnrollmentApplicationFormDialog } from '@/components/acadia/enrollment/enrollment-application-form-dialog';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import {
  EMPTY_CATALOG_FILTERS,
  rowMatchesCatalogFilters,
  streamLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import {
  applicantDisplayName,
  ENROLLMENT_APPLICATION_ID_PARAM,
  ENROLLMENT_APPLICATION_VIEW_PARAM,
  enrollmentApplicationsHref,
  parseEnrollmentApplicationView,
} from '@/lib/acadia/enrollment';
import { useTranslation } from '@/hooks/useTranslation';

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
};

export default function EnrollmentApplicationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get(ENROLLMENT_APPLICATION_ID_PARAM);
  const selectedView = parseEnrollmentApplicationView(
    searchParams.get(ENROLLMENT_APPLICATION_VIEW_PARAM),
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);

  useEffect(() => {
    if (selectedId) {
      setSheetOpen(false);
    }
  }, [selectedId]);

  const closeReview = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(ENROLLMENT_APPLICATION_ID_PARAM);
    params.delete(ENROLLMENT_APPLICATION_VIEW_PARAM);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'applicant',
        header: 'Applicant',
        cell: ({ row }) => (
          <Link
            href={enrollmentApplicationsHref(row.original.id)}
            scroll={false}
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
          streamLabel(row.original.subSystem, row.original.branch),
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
      title={t('enrollment.applicationsTitle')}
      description={t('enrollment.applicationsDescription')}
    >
      <div className={selectedView === 'confirmation' ? 'print:hidden' : undefined}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CatalogFilterBar
            filters={catalogFilters}
            onChange={setCatalogFilters}
            className="mb-0"
          />
          <AdminToolbar
            addLabel={t('enrollment.newApplication')}
            onAdd={() => setSheetOpen(true)}
            className="mb-0"
          />
        </div>
        <SupabaseTableList scopeByAcademicYear
          table="EnrollmentApplication"
          title="Applications"
          select="id, status, kind, firstNameEn, lastNameEn, firstNameFr, lastNameFr, subSystem, branch, createdAt"
          columns={columns}
          searchKeys={['status', 'kind', 'lastNameEn', 'firstNameEn']}
          rowFilter={(row) => rowMatchesCatalogFilters(row, catalogFilters)}
        />
      </div>
      <EnrollmentApplicationFormDialog
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
      <ApplicationReviewSheet
        applicationId={selectedId}
        view={selectedView}
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) {
            closeReview();
          }
        }}
      />
    </AcadiaPageShell>
  );
}
