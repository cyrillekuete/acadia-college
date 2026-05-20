'use client';

import { useState } from 'react';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { LevelFormDialog } from '@/components/acadia/academics/level-form-dialog';
import { LevelsTable } from '@/components/acadia/academics/levels-table';
import { RegistryDeleteDialog } from '@/components/acadia/academics/registry-delete-dialog';
import { Button } from '@/components/ui/button';
import {
  EMPTY_CATALOG_FILTERS,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { useAcademicStructureMutations } from '@/hooks/use-academic-structure-mutations';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { type LevelListRow } from '@/hooks/use-level-list';
import { useLevelDeleteBlockers } from '@/hooks/use-level-delete-blockers';
import {
  canCascadeDeleteClasses,
  formatLevelDeleteBlockers,
  hasNonClassBlockers,
} from '@/lib/supabase/queries/level-delete';

function buildLevelDeleteDescription(
  levelName: string,
  blockers: ReturnType<typeof useLevelDeleteBlockers>['data'],
  isLoadingBlockers: boolean,
): string {
  if (isLoadingBlockers || !blockers) {
    return `Checking what references "${levelName}"…`;
  }

  if (hasNonClassBlockers(blockers)) {
    const lines = formatLevelDeleteBlockers(blockers);
    return `Cannot delete "${levelName}" yet:\n• ${lines.join('\n• ')}\n\nRemove or reassign these records first (e.g. delete subjects tied to this level, migrate enrollments, or delete classes from Academic structure → Classes).`;
  }

  if (canCascadeDeleteClasses(blockers)) {
    return `This will permanently delete "${levelName}" and its ${blockers.classes} linked class(es). This cannot be undone.`;
  }

  return `This will permanently delete "${levelName}". This action cannot be undone.`;
}

export default function LevelsPage() {
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<LevelListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LevelListRow | null>(null);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const { deleteLevel, importLevelCatalog } = useAcademicStructureMutations();
  const { data: deleteBlockers, isLoading: deleteBlockersLoading } =
    useLevelDeleteBlockers(deleteTarget?.id ?? null);

  const canImportCatalog =
    canManage && catalogFilters.subSystem !== null && catalogFilters.branch !== null;

  const openCreateDialog = () => {
    setEditingLevel(null);
    setLevelDialogOpen(true);
  };

  const deleteDescription = deleteTarget
    ? buildLevelDeleteDescription(
        deleteTarget.name,
        deleteBlockers,
        deleteBlockersLoading,
      )
    : '';

  const deleteBlocked =
    deleteBlockers !== undefined && hasNonClassBlockers(deleteBlockers);

  return (
    <AcadiaPageShell
      title="Acadia College — Levels"
      description="Define structural levels (Form 1, Form 2, …) for each sub-system and branch before creating classes."
    >
      <CatalogFilterBar filters={catalogFilters} onChange={setCatalogFilters} />

      <AdminToolbar addLabel="New level" onAdd={openCreateDialog}>
        {canManage ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canImportCatalog || importLevelCatalog.isPending}
            title={
              canImportCatalog
                ? undefined
                : 'Select sub-system and branch in the filters above to import the standard catalog.'
            }
            onClick={() => {
              if (catalogFilters.subSystem && catalogFilters.branch) {
                importLevelCatalog.mutate({
                  subSystem: catalogFilters.subSystem,
                  branch: catalogFilters.branch,
                });
              }
            }}
          >
            Import standard levels
          </Button>
        ) : null}
      </AdminToolbar>

      {canManage && !canImportCatalog ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Select a sub-system and branch above to import the Cameroon standard level catalog.
        </p>
      ) : null}

      <LevelsTable
        filters={catalogFilters}
        onCreate={canManage ? openCreateDialog : undefined}
        onEdit={(row) => {
          setEditingLevel(row);
          setLevelDialogOpen(true);
        }}
        onDelete={canManage ? (row) => setDeleteTarget(row) : undefined}
      />

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

      <RegistryDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title={deleteTarget ? `Delete level "${deleteTarget.name}"?` : 'Delete level?'}
        description={deleteDescription}
        confirmDisabled={deleteBlocked || deleteBlockersLoading}
        pending={deleteLevel.isPending}
        onConfirm={() => {
          if (deleteBlocked) {
            return;
          }
          if (!deleteTarget) {
            return;
          }
          deleteLevel.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </AcadiaPageShell>
  );
}
