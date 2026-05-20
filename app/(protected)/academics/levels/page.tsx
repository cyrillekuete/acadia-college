'use client';

import { useState } from 'react';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { ClassFormDialog } from '@/components/acadia/academics/class-form-dialog';
import { ClassesTable } from '@/components/acadia/academics/classes-table';
import { LevelFormDialog } from '@/components/acadia/academics/level-form-dialog';
import { LevelsTable } from '@/components/acadia/academics/levels-table';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EMPTY_CATALOG_FILTERS, type CatalogFilters } from '@/lib/acadia/education-system';
import { useAcademicStructureMutations } from '@/hooks/use-academic-structure-mutations';
import { type ClassListRow } from '@/hooks/use-class-list';
import { type LevelListRow } from '@/hooks/use-level-list';

type TableView = 'levels' | 'classes';

export default function ClassesAndLevelsPage() {
  const [tableView, setTableView] = useState<TableView>('levels');
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<LevelListRow | null>(null);
  const [editingClass, setEditingClass] = useState<ClassListRow | null>(null);
  const { deleteLevel, deleteClass } = useAcademicStructureMutations();

  return (
    <AcadiaPageShell
      title="Acadia College — Classes & Levels"
      description="Define structural levels (Form 1, Form 2, …) and the classes within each level (e.g. Form 5 Arts, Form 5 Science)."
    >
      <CatalogFilterBar filters={catalogFilters} onChange={setCatalogFilters} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          value={tableView}
          onValueChange={setTableView}
          aria-label="Table view"
          options={[
            { value: 'levels', label: 'Levels' },
            { value: 'classes', label: 'Classes' },
          ]}
        />

        {tableView === 'classes' ? (
          <AdminToolbar
            className="mb-0"
            addLabel="New class"
            onAdd={() => {
              setEditingClass(null);
              setClassDialogOpen(true);
            }}
          />
        ) : (
          <AdminToolbar
            className="mb-0"
            addLabel="New level"
            onAdd={() => {
              setEditingLevel(null);
              setLevelDialogOpen(true);
            }}
          />
        )}
      </div>

      {tableView === 'levels' ? (
        <LevelsTable
          filters={catalogFilters}
          onEdit={(row) => {
            setEditingLevel(row);
            setLevelDialogOpen(true);
          }}
          onDelete={(row) => {
            const warning =
              row.classCount > 0
                ? `Delete level "${row.name}"? ${row.classCount} class(es) are linked to this level and may block deletion.`
                : `Delete level "${row.name}"?`;
            if (window.confirm(warning)) {
              deleteLevel.mutate(row.id);
            }
          }}
        />
      ) : null}

      {tableView === 'classes' ? (
        <ClassesTable
          filters={catalogFilters}
          onEdit={(row) => {
            setEditingClass(row);
            setClassDialogOpen(true);
          }}
          onDelete={(row) => {
            if (window.confirm(`Delete class "${row.name}"?`)) {
              deleteClass.mutate(row.id);
            }
          }}
        />
      ) : null}

      <LevelFormDialog
        open={levelDialogOpen}
        onOpenChange={(open) => {
          setLevelDialogOpen(open);
          if (!open) {
            setEditingLevel(null);
          }
        }}
        record={editingLevel}
        defaultFilters={catalogFilters}
      />
      <ClassFormDialog
        open={classDialogOpen}
        onOpenChange={(open) => {
          setClassDialogOpen(open);
          if (!open) {
            setEditingClass(null);
          }
        }}
        record={editingClass}
        defaultFilters={catalogFilters}
      />
    </AcadiaPageShell>
  );
}
