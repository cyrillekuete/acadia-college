'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { TermFormDialog } from '@/components/acadia/academics/term-form-dialog';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';
import { termLabel } from '@/lib/acadia/record-display';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';

type Row = {
  id: string;
  number: number;
  academicYearId: string;
  levelId: string | null;
  AcademicYear?: unknown;
  Level?: unknown;
};

export default function TermsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const { deleteTerm } = useAcademicCalendarMutations();

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'number',
        header: 'Term',
        cell: ({ row }) => termLabel({ number: row.original.number }),
      },
      nestedFieldColumn<Row>('year', 'Academic year', 'AcademicYear', 'label'),
      nestedFieldColumn<Row>('level', 'Level', 'Level', 'number'),
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
                  `Delete ${termLabel({ number: row.original.number })}? This may fail if the term is in use.`,
                )
              ) {
                deleteTerm.mutate(row.original.id);
              }
            }}
          />
        ),
      },
    ],
    [deleteTerm],
  );

  return (
    <AcadiaPageShell
      title="Acadia College — Terms"
      description="Three terms per academic year (Cameroon secondary schools)."
    >
      <AdminToolbar
        addLabel="New term"
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
      />
      <SupabaseTableList
        table="Term"
        title="Terms"
        select="id, number, academicYearId, levelId, AcademicYear:academicYearId ( label ), Level:levelId ( number )"
        columns={columns}
        searchKeys={['number']}
      />
      <TermFormDialog open={dialogOpen} onOpenChange={setDialogOpen} record={editing} />
    </AcadiaPageShell>
  );
}
