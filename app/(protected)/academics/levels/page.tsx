'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { ClassFormDialog } from '@/components/acadia/academics/class-form-dialog';
import { ClassesTable } from '@/components/acadia/academics/classes-table';
import { LevelFormDialog } from '@/components/acadia/academics/level-form-dialog';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  EMPTY_CATALOG_FILTERS,
  branchLabel,
  rowMatchesCatalogFilters,
  subSystemLabel,
  type AcademicBranch,
  type AcademicSubSystem,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { formatDate } from '@/lib/helpers';
import { useAcademicStructureMutations } from '@/hooks/use-academic-structure-mutations';
import { type ClassListRow } from '@/hooks/use-class-list';

type LevelRow = {
  id: string;
  name: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  createdAt: string;
  labelEn?: string | null;
  labelFr?: string | null;
  sortOrder?: number | null;
};

type TableView = 'levels' | 'classes';

export default function ClassesAndLevelsPage() {
  const [tableView, setTableView] = useState<TableView>('levels');
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<LevelRow | null>(null);
  const [editingClass, setEditingClass] = useState<ClassListRow | null>(null);
  const { deleteLevel, deleteClass } = useAcademicStructureMutations();

  const levelColumns = useMemo<ColumnDef<LevelRow>[]>(
    () => [
      { accessorKey: 'name', header: 'Level Name' },
      {
        id: 'subSystem',
        header: 'Subsystem',
        cell: ({ row }) => subSystemLabel(row.original.subSystem),
      },
      {
        id: 'branch',
        header: 'Branch',
        cell: ({ row }) => branchLabel(row.original.branch),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created At',
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <RegistryRowActions
            onEdit={() => {
              setEditingLevel(row.original);
              setLevelDialogOpen(true);
            }}
            onDelete={() => {
              if (window.confirm(`Delete level "${row.original.name}"?`)) {
                deleteLevel.mutate(row.original.id);
              }
            }}
          />
        ),
      },
    ],
    [deleteLevel],
  );

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
          <AdminToolbar className="mb-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingLevel(null);
                setLevelDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              New level
            </Button>
          </AdminToolbar>
        )}
      </div>

      {tableView === 'levels' ? (
        <SupabaseTableList
          table="Level"
          title="Levels"
          select="id, name, subSystem, branch, createdAt, labelEn, labelFr, sortOrder"
          columns={levelColumns}
          searchKeys={['name', 'labelEn']}
          rowFilter={(row) => rowMatchesCatalogFilters(row, catalogFilters)}
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
        onOpenChange={setLevelDialogOpen}
        record={editingLevel}
        defaultFilters={catalogFilters}
      />
      <ClassFormDialog
        open={classDialogOpen}
        onOpenChange={setClassDialogOpen}
        record={editingClass}
        defaultFilters={catalogFilters}
      />
    </AcadiaPageShell>
  );
}
