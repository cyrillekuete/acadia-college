'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { ACADEMIC_STRUCTURE_TABLE_LAYOUT } from '@/components/acadia/academics/academic-structure-table-layout';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { TermFormDialog } from '@/components/acadia/academics/term-form-dialog';
import { TermsStructureCard } from '@/components/acadia/academics/terms-structure-card';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { formatRecordValue, termLabel, unwrapRelation } from '@/lib/acadia/record-display';
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
  const [structureOpen, setStructureOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const { deleteTerm } = useAcademicCalendarMutations();

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'number',
        header: ({ column }) => (
          <DataGridColumnHeader title="Term" visibility column={column} />
        ),
        cell: ({ row }) => termLabel({ number: row.original.number }),
        size: 160,
      },
      {
        id: 'level',
        header: ({ column }) => (
          <DataGridColumnHeader title="Level" visibility column={column} />
        ),
        cell: ({ row }) => {
          const rel = unwrapRelation<Record<string, unknown>>(row.original.Level);
          if (!rel) {
            return '—';
          }
          return formatRecordValue(rel.number);
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
      actions={
        <AdminToolbar
          addLabel={t('academics.addTerm')}
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
              Terms per academic year
            </Button>
          ) : null}
        </AdminToolbar>
      }
    >
      {!activeYearId ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Select an academic year in the header to manage terms.
        </p>
      ) : null}
      <SupabaseTableList
        table="Term"
        title={t('academics.termsTitle')}
        select="id, number, academicYearId, levelId, Level!Semester_levelId_tenantId_fkey ( number )"
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
        <TermsStructureCard
          open={structureOpen}
          onOpenChange={setStructureOpen}
          academicYearId={activeYearId}
        />
      ) : null}
      <TermFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
        defaultAcademicYearId={activeYearId || undefined}
      />
    </AcadiaPageShell>
  );
}
