'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { TermFormDialog } from '@/components/acadia/academics/term-form-dialog';
import { TermsStructureCard } from '@/components/acadia/academics/terms-structure-card';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';
import { termLabel } from '@/lib/acadia/record-display';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';
import { useTranslation } from '@/hooks/useTranslation';

type Row = {
  id: string;
  number: number;
  academicYearId: string;
  levelId: string | null;
  AcademicYear?: unknown;
  Level?: unknown;
};

export default function TermsPage() {
  const { t } = useTranslation();
  const { activeYearId } = useActiveAcademicYear();
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
      title={t('academics.termsTitle')}
      description={t('academics.termsDescription')}
    >
      <div className="mb-6 space-y-6">
        {activeYearId ? (
          <TermsStructureCard academicYearId={activeYearId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select an academic year in the header to manage terms.
          </p>
        )}
      </div>

      <AdminToolbar
        addLabel={t('academics.addTerm')}
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
      />
      <SupabaseTableList
        table="Term"
        title={t('academics.termsTitle')}
        select="id, number, academicYearId, levelId, Level!Semester_levelId_tenantId_fkey ( number )"
        columns={columns}
        searchKeys={['number']}
        rowFilter={
          activeYearId
            ? (row) => row.academicYearId === activeYearId
            : undefined
        }
      />
      <TermFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
        defaultAcademicYearId={activeYearId || undefined}
      />
    </AcadiaPageShell>
  );
}
