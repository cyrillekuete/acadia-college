'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { SequenceFormDialog } from '@/components/acadia/academics/sequence-form-dialog';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';
import { sequenceLabel, termLabel } from '@/lib/acadia/record-display';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';

type Row = {
  id: string;
  number: number;
  numberInTerm: number;
  termId: string;
  academicYearId: string;
  Term?: unknown;
  AcademicYear?: unknown;
};

export default function SequencesPage() {
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
      nestedFieldColumn<Row>('year', 'Academic year', 'AcademicYear', 'label'),
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
      title="Acadia College — Sequences"
      description="Six sequences per academic year (two per term) for sequence exams and marks."
    >
      <AdminToolbar
        addLabel="New sequence"
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
      />
      <SupabaseTableList
        table="AcademicSequence"
        title="Sequences"
        select="id, number, numberInTerm, termId, academicYearId, AcademicYear:academicYearId ( label ), Term:termId ( number )"
        columns={columns}
        searchKeys={['number']}
      />
      <SequenceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
      />
    </AcadiaPageShell>
  );
}
