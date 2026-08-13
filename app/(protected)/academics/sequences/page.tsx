'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { SequenceFormDialog } from '@/components/acadia/academics/sequence-form-dialog';
import { SequencesStructureCard } from '@/components/acadia/academics/sequences-structure-card';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
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
  const [editing, setEditing] = useState<Row | null>(null);
  const { deleteSequence } = useAcademicCalendarMutations();

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'number',
        header: 'Sequence',
        cell: ({ row }) =>
          sequenceLabel({
            number: row.original.number,
            numberInTerm: row.original.numberInTerm,
          }),
      },
      {
        id: 'term',
        header: 'Term',
        cell: ({ row }) => {
          const rel = row.original.Term;
          const term = Array.isArray(rel) ? rel[0] : rel;
          if (term && typeof term === 'object' && 'number' in term) {
            return termLabel({ number: (term as { number: number }).number });
          }
          return '—';
        },
      },
      {
        id: 'actions',
        header: '',
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
    >
      <div className="mb-6 space-y-6">
        {activeYearId ? (
          <SequencesStructureCard academicYearId={activeYearId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select an academic year in the header to manage sequences.
          </p>
        )}
      </div>

      <AdminToolbar
        addLabel={t('academics.addSequence')}
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
      />
      <SupabaseTableList
        table="AcademicSequence"
        title={t('academics.sequencesTitle')}
        select="id, number, numberInTerm, termId, academicYearId, Term:termId ( number )"
        columns={columns}
        searchKeys={['number']}
        rowFilter={
          activeYearId
            ? (row) => row.academicYearId === activeYearId
            : undefined
        }
      />
      <SequenceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
        defaultAcademicYearId={activeYearId || undefined}
      />
    </AcadiaPageShell>
  );
}
