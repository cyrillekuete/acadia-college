'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';
import { useTranslation } from '@/hooks/useTranslation';

type Row = {
  id: string;
  status?: string;
  createdAt?: string;
  StudentProfile?: unknown;
  AcademicYear?: unknown;
} & Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  nestedFieldColumn<Row>(
    'student',
    'Student',
    'StudentProfile',
    'registrationNumber',
  ),
  nestedFieldColumn<Row>('year', 'Academic year', 'AcademicYear', 'label'),
  { accessorKey: 'status', header: 'Status' },
  {
    accessorKey: 'createdAt',
    header: 'Enrolled',
    cell: ({ row }) => {
      const value = row.original.createdAt;
      return value ? new Date(String(value)).toLocaleDateString() : '—';
    },
  },
];

export default function StudentEnrollmentsPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('enrollment.enrollmentsTitle')}
      description={t('enrollment.enrollmentsDescription')}
    >
      <SupabaseTableList scopeByAcademicYear
        table="StudentEnrollment"
        title="Enrollments"
        select="id, status, createdAt, StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey ( id, registrationNumber ), AcademicYear!StudentEnrollment_academicYearId_tenantId_fkey ( label )"
        columns={columns}
        searchKeys={['status']}
      />
    </AcadiaPageShell>
  );
}
