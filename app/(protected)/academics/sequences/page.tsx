'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { ACADEMIC_STRUCTURE_TABLE_LAYOUT } from '@/components/acadia/academics/academic-structure-table-layout';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { SequenceFormDialog } from '@/components/acadia/academics/sequence-form-dialog';
import { SequencesStructureCard } from '@/components/acadia/academics/sequences-structure-card';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { sequenceLabel, termLabel } from '@/lib/acadia/record-display';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import { useTranslation } from '@/hooks/useTranslation';

type Row = {
  id: string;
  number: number;
  numberInTerm: number;
  termId: string;
  academicYearId: string;
  Term?: unknown;
};

export default function SequencesPage() {
  const { t } = useTranslation();
  const { activeYearId } = useActiveAcademicYear();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const { deleteSequence } = useAcademicCalendarMutations();

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'number',
        header: ({ column }) => (
          <DataGridColumnHeader title="Sequence" visibility column={column} />
        ),
        cell: ({ row }) =>
          sequenceLabel({
            number: row.original.number,
            numberInTerm: row.original.numberInTerm,
          }),
        size: 180,
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
          return '—';
        },
        size: 140,
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
              if (
                window.confirm(
                  `Delete sequence ${row.original.number}? This may fail if it is in use.`,
                )
              ) {
                deleteSequence.mutate(row.original.id);
              }
            }}
          />
        ),
      },
    ],
    [deleteSequence],
  );

  return (
    <AcadiaPageShell
      title={t('academics.sequencesTitle')}
      description={t('academics.sequencesDescription')}
      actions={
        <AdminToolbar
          addLabel={t('academics.addSequence')}
          onAdd={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="mb-0"
        >
          {activeYearId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setStructureOpen(true)}
            >
              Sequences per term and year
            </Button>
          ) : null}
        </AdminToolbar>
      }
    >
      {!activeYearId ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Select an academic year in the header to manage sequences.
        </p>
      ) : null}
      <SupabaseTableList
        table="AcademicSequence"
        title={t('academics.sequencesTitle')}
        select="id, number, numberInTerm, termId, academicYearId, Term:termId ( number )"
        columns={columns}
        searchKeys={['number']}
        tableLayout={ACADEMIC_STRUCTURE_TABLE_LAYOUT}
        rowFilter={
          activeYearId
            ? (row) => row.academicYearId === activeYearId
            : undefined
        }
      />
      {activeYearId ? (
        <SequencesStructureCard
          open={structureOpen}
          onOpenChange={setStructureOpen}
          academicYearId={activeYearId}
        />
      ) : null}
      <SequenceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
        defaultAcademicYearId={activeYearId || undefined}
      />
    </AcadiaPageShell>
  );
}
