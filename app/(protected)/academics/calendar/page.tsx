'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AcademicCalendarMonthView } from '@/components/acadia/academics/academic-calendar-month-view';
import { ACADEMIC_STRUCTURE_TABLE_LAYOUT } from '@/components/acadia/academics/academic-structure-table-layout';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { CalendarMilestoneFormDialog } from '@/components/acadia/academics/calendar-milestone-form-dialog';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { formatRecordValue, termLabel, unwrapRelation } from '@/lib/acadia/record-display';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import { useAcademicCalendarMilestones } from '@/hooks/use-academic-calendar-milestones';
import { useTranslation } from '@/hooks/useTranslation';

type Row = {
  id: string;
  kind: string;
  onDate: string;
  labelEn: string | null;
  labelFr: string | null;
  academicYearId: string;
  termId: string | null;
  AcademicYear?: unknown;
  Term?: unknown;
};

function kindLabel(kind: string): string {
  return kind
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function AcademicCalendarPage() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const { deleteMilestone } = useAcademicCalendarMutations();
  const { activeYearId } = useActiveAcademicYear();
  const { data: calendarContext } = useAcademicCalendarMilestones(activeYearId);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'kind',
        header: ({ column }) => (
          <DataGridColumnHeader title="Kind" visibility column={column} />
        ),
        cell: ({ row }) => kindLabel(row.original.kind),
        size: 160,
      },
      {
        accessorKey: 'onDate',
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" visibility column={column} />
        ),
        size: 140,
      },
      {
        accessorKey: 'labelEn',
        header: ({ column }) => (
          <DataGridColumnHeader title="Label (EN)" visibility column={column} />
        ),
        size: 180,
      },
      {
        id: 'year',
        header: ({ column }) => (
          <DataGridColumnHeader title="Academic year" visibility column={column} />
        ),
        cell: ({ row }) => {
          const rel = unwrapRelation<Record<string, unknown>>(
            row.original.AcademicYear,
          );
          if (!rel) {
            return '—';
          }
          return formatRecordValue(rel.label);
        },
        size: 160,
      },
      {
        id: 'term',
        header: ({ column }) => (
          <DataGridColumnHeader title="Term" visibility column={column} />
        ),
        cell: ({ row }) => {
          const rel = row.original.Term;
          const term = Array.isArray(rel) ? rel[0] : rel;
          if (term && typeof term === 'object' && 'number' in term) {
            return termLabel({ number: (term as { number: number }).number });
          }
          return formatRecordValue(null);
        },
        size: 100,
      },
      {
        id: 'actions',
        header: '',
        size: 80,
        enableResizing: false,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <RegistryRowActions
            onEdit={() => {
              setEditing(row.original);
              setDialogOpen(true);
            }}
            onDelete={() => {
              if (window.confirm('Delete this calendar milestone?')) {
                deleteMilestone.mutate(row.original.id);
              }
            }}
          />
        ),
      },
    ],
    [deleteMilestone],
  );

  return (
    <AcadiaPageShell
      title={t('academics.calendarTitle')}
      description={t('academics.calendarDescription')}
      actions={
        <AdminToolbar
          addLabel="New milestone"
          onAdd={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="mb-0"
        />
      }
    >
      <AcademicCalendarMonthView
        milestones={calendarContext?.milestones ?? []}
        className="mb-6"
      />

      <SupabaseTableList
        scopeByAcademicYear
        table="AcademicCalendarMilestone"
        title="Calendar milestones"
        select="id, kind, onDate, labelEn, labelFr, academicYearId, termId, AcademicYear!AcademicCalendarMilestone_academicYearId_tenantId_fkey ( label ), Term!AcademicCalendarMilestone_semesterId_tenantId_fkey ( number )"
        columns={columns}
        searchKeys={['labelEn', 'kind']}
        tableLayout={ACADEMIC_STRUCTURE_TABLE_LAYOUT}
      />
      <CalendarMilestoneFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
      />
    </AcadiaPageShell>
  );
}
