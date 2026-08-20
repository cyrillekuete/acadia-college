'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { ArrowRightLeft, Star, Users } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AcademicYearFormDialog } from '@/components/acadia/academics/academic-year-form-dialog';
import { ACADEMIC_STRUCTURE_TABLE_LAYOUT } from '@/components/acadia/academics/academic-structure-table-layout';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { formatRecordValue } from '@/lib/acadia/record-display';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import { useTranslation } from '@/hooks/useTranslation';

type Row = {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  isActive: boolean;
};

export default function AcademicYearsPage() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const { setAcademicYearCurrent } = useAcademicCalendarMutations();

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'label',
        header: ({ column }) => (
          <DataGridColumnHeader title="Label" visibility column={column} />
        ),
        size: 180,
      },
      {
        accessorKey: 'startsOn',
        header: ({ column }) => (
          <DataGridColumnHeader title="Starts" visibility column={column} />
        ),
        size: 140,
      },
      {
        accessorKey: 'endsOn',
        header: ({ column }) => (
          <DataGridColumnHeader title="Ends" visibility column={column} />
        ),
        size: 140,
      },
      {
        accessorKey: 'isCurrent',
        header: ({ column }) => (
          <DataGridColumnHeader title="Current" visibility column={column} />
        ),
        cell: ({ row }) => formatRecordValue(row.original.isCurrent),
        size: 100,
      },
      {
        accessorKey: 'isActive',
        header: ({ column }) => (
          <DataGridColumnHeader title="Active" visibility column={column} />
        ),
        cell: ({ row }) =>
          row.original.isActive ? formatRecordValue(true) : t('academics.closedYear'),
        size: 100,
      },
      {
        id: 'actions',
        header: '',
        size: 160,
        enableResizing: false,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {!row.original.isCurrent ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={t('academics.setCurrentYear')}
                disabled={setAcademicYearCurrent.isPending}
                onClick={() => setAcademicYearCurrent.mutate(row.original.id)}
              >
                <Star className="size-4" />
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="icon" title={t('academics.promotionTitle')} asChild>
              <Link href={`/academics/promotion?year=${row.original.id}`}>
                <Users className="size-4" />
              </Link>
            </Button>
            <Button type="button" variant="ghost" size="icon" title={t('academics.yearRollover')} asChild>
              <Link href={`/academics/years/${row.original.id}/rollover`}>
                <ArrowRightLeft className="size-4" />
              </Link>
            </Button>
            <RegistryRowActions
              onEdit={() => {
                setEditing(row.original);
                setDialogOpen(true);
              }}
            />
          </div>
        ),
      },
    ],
    [setAcademicYearCurrent, t],
  );

  return (
    <AcadiaPageShell
      title={t('academics.yearsTitle')}
      description={t('academics.yearsDescription')}
      actions={
        <AdminToolbar
          addLabel={t('academics.addYear')}
          onAdd={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="mb-0"
        />
      }
    >
      <SupabaseTableList
        table="AcademicYear"
        title={t('academics.yearsTitle')}
        select="id, label, startsOn, endsOn, isCurrent, isActive, termsPerYear, sequencesPerTerm, sequencesPerYear, enrollmentOpensAt, enrollmentClosesAt"
        columns={columns}
        searchKeys={['label']}
        tableLayout={ACADEMIC_STRUCTURE_TABLE_LAYOUT}
      />
      <AcademicYearFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
      />
    </AcadiaPageShell>
  );
}
