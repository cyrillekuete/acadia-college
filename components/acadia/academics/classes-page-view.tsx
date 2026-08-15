'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { ClassFormDialog } from '@/components/acadia/academics/class-form-dialog';
import { ClassSubjectAssignDialog } from '@/components/acadia/academics/class-subject-assign-dialog';
import { ClassTeacherAssignDialog } from '@/components/acadia/academics/class-teacher-assign-dialog';
import { ClassesTable } from '@/components/acadia/academics/classes-table';
import { RegistryDeleteDialog } from '@/components/acadia/academics/registry-delete-dialog';
import { EMPTY_CATALOG_FILTERS, type CatalogFilters } from '@/lib/acadia/education-system';
import { useAcademicStructureMutations } from '@/hooks/use-academic-structure-mutations';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useClassDeleteBlockers } from '@/hooks/use-class-delete-blockers';
import { useTranslation } from '@/hooks/useTranslation';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { type ClassListRow } from '@/hooks/use-class-list';
import {
  formatClassDeleteBlockers,
  hasClassDeleteBlockers,
} from '@/lib/supabase/queries/class-delete';

function buildClassDeleteDescription(
  className: string,
  blockers: ReturnType<typeof useClassDeleteBlockers>['data'],
  isLoadingBlockers: boolean,
): string {
  if (isLoadingBlockers || !blockers) {
    return `Checking what references "${className}"…`;
  }

  if (hasClassDeleteBlockers(blockers)) {
    const lines = formatClassDeleteBlockers(blockers).filter(
      (line) => !line.includes('will be cleared on delete'),
    );
    return `Cannot delete "${className}" yet:\n• ${lines.join('\n• ')}\n\nMigrate or remove these records first (e.g. reassign enrollments from Academic structure → Classes or student profiles).`;
  }

  const informational = formatClassDeleteBlockers(blockers).filter((line) =>
    line.includes('will be cleared on delete'),
  );
  const suffix =
    informational.length > 0 ? `\n\nNote: ${informational.join('; ')}.` : '';

  return `This will permanently delete "${className}". Class subjects and promotion policies for this class will also be removed. This action cannot be undone.${suffix}`;
}

export function ClassesPageView({
  initialClasses,
  seedYearId,
}: {
  initialClasses?: ClassListRow[];
  seedYearId?: string | null;
}) {
  const { t } = useTranslation();
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassListRow | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignClassIds, setAssignClassIds] = useState<string[]>([]);
  const [teacherAssignClass, setTeacherAssignClass] = useState<ClassListRow | null>(
    null,
  );
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const { deleteClass } = useAcademicStructureMutations();
  const { data: deleteBlockers, isLoading: deleteBlockersLoading } =
    useClassDeleteBlockers(deleteTarget?.id ?? null);

  const openCreateDialog = () => {
    setEditingClass(null);
    setClassDialogOpen(true);
  };

  const deleteDescription = deleteTarget
    ? buildClassDeleteDescription(
        deleteTarget.name,
        deleteBlockers,
        deleteBlockersLoading,
      )
    : '';

  const deleteBlocked =
    deleteBlockers !== undefined && hasClassDeleteBlockers(deleteBlockers);

  return (
    <AcadiaPageShell
      title={t('academics.classesTitle')}
      description={t('academics.classesDescription')}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CatalogFilterBar
          filters={catalogFilters}
          onChange={setCatalogFilters}
          className="mb-0"
        />

        <AdminToolbar
          addLabel={t('academics.addClass')}
          onAdd={openCreateDialog}
          className="mb-0"
        >
          {canManage ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setAssignClassIds([]);
                setAssignDialogOpen(true);
              }}
            >
              {t('academics.assignToClasses')}
            </Button>
          ) : null}
        </AdminToolbar>
      </div>

      <ClassesTable
        filters={catalogFilters}
        initialClasses={initialClasses}
        seedYearId={seedYearId}
        onCreate={canManage ? openCreateDialog : undefined}
        onEdit={(row) => {
          setEditingClass(row);
          setClassDialogOpen(true);
        }}
        onDelete={canManage ? (row) => setDeleteTarget(row) : undefined}
        onAssignSubjects={
          canManage
            ? (row) => {
                setAssignClassIds([row.id]);
                setAssignDialogOpen(true);
              }
            : undefined
        }
        onAssignTeachers={
          canManage ? (row) => setTeacherAssignClass(row) : undefined
        }
      />

      <ClassSubjectAssignDialog
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) {
            setAssignClassIds([]);
          }
        }}
        catalogFilters={catalogFilters}
        initialClassIds={assignClassIds}
      />

      <ClassTeacherAssignDialog
        open={teacherAssignClass !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTeacherAssignClass(null);
          }
        }}
        classId={teacherAssignClass?.id ?? null}
        className={teacherAssignClass?.name}
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

      <RegistryDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title={deleteTarget ? `Delete class "${deleteTarget.name}"?` : 'Delete class?'}
        description={deleteDescription}
        confirmDisabled={deleteBlocked || deleteBlockersLoading}
        pending={deleteClass.isPending}
        onConfirm={() => {
          if (deleteBlocked) {
            return;
          }
          if (!deleteTarget) {
            return;
          }
          deleteClass.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </AcadiaPageShell>
  );
}
