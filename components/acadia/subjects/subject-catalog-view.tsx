'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { SubjectsTable } from '@/components/acadia/subjects/subjects-table';
import { SubjectClassAssignDialog } from '@/components/acadia/subjects/subject-class-assign-dialog';
import { SubjectFormDialog } from '@/components/acadia/subjects/subject-form-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  branchLabel,
  EMPTY_CATALOG_FILTERS,
  parseAcademicBranch,
  parseAcademicSubSystem,
  subSystemLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { levelLabel } from '@/lib/acadia/record-display';
import { useSubjectGroupingOptions } from '@/hooks/use-subject-grouping-options';
import { useSubjectList, type SubjectListRowView } from '@/hooks/use-subject-list';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteAcademicAdmin } from '@/lib/acadia/roles';
import {
  DEFAULT_SUBJECT_LIST_FILTERS,
  UNGROUPED_SUBJECT_FILTER,
  rowMatchesSubjectListFilters,
  type SubjectListFilters,
  type SubjectStatusFilter,
} from '@/lib/acadia/subject';
import { useTranslation } from '@/hooks/useTranslation';
import { useSubjectGroupingMutations } from '@/hooks/use-subject-grouping-mutations';

const ALL = '__all__';

function resolveSubjectStream(row: SubjectListRowView) {
  return {
    subSystem: parseAcademicSubSystem(row.subSystem),
    branch: parseAcademicBranch(row.branch),
  };
}

function buildEmptyMessage(
  catalogFilters: CatalogFilters,
  listFilters: SubjectListFilters,
): string {
  const parts: string[] = [];
  if (catalogFilters.subSystem) {
    parts.push(subSystemLabel(catalogFilters.subSystem));
  }
  if (catalogFilters.branch) {
    parts.push(branchLabel(catalogFilters.branch));
  }
  const scope = parts.length > 0 ? parts.join(' · ') : 'this catalog scope';
  if (listFilters.status === 'inactive') {
    return `No inactive subjects for ${scope}.`;
  }
  return `No subjects for ${scope}. Create one to get started.`;
}

export function SubjectCatalogView({
  initialSubjects,
}: {
  initialSubjects?: SubjectListRowView[];
}) {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteAcademicAdmin(session?.roleSlug);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [listFilters, setListFilters] = useState<SubjectListFilters>(
    DEFAULT_SUBJECT_LIST_FILTERS,
  );
  const [assignSubject, setAssignSubject] = useState<SubjectListRowView | null>(
    null,
  );
  const { data: groupings = [] } = useSubjectGroupingOptions();
  const { data: subjects = [] } = useSubjectList(catalogFilters, initialSubjects, {
    allYears: listFilters.allYears,
  });
  const { moveSubjectsToGrouping } = useSubjectGroupingMutations();
  const [moveGroupingId, setMoveGroupingId] = useState(UNGROUPED_SUBJECT_FILTER);

  const filteredSubjects = useMemo(
    () => subjects.filter((row) => rowMatchesSubjectListFilters(row, listFilters)),
    [subjects, listFilters],
  );

  const levelOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const row of subjects) {
      const ids = row.levelIds?.length ? row.levelIds : row.levelId ? [row.levelId] : [];
      for (const levelId of ids) {
        if (map.has(levelId)) {
          continue;
        }
        const junction = row.SubjectLevel?.find((item) => item.levelId === levelId);
        map.set(levelId, {
          id: levelId,
          label: levelLabel(junction?.Level ?? (levelId === row.levelId ? row.Level : null)),
        });
      }
    }
    return Array.from(map.values());
  }, [subjects]);

  const emptyMessage = buildEmptyMessage(catalogFilters, listFilters);

  const assignSubjectStream = useMemo(
    () => (assignSubject ? resolveSubjectStream(assignSubject) : null),
    [assignSubject],
  );
  const handleBulkMove = () => {
    const ids = filteredSubjects.map((row) => row.id);
    if (ids.length === 0) {
      return;
    }
    const grouping =
      moveGroupingId === UNGROUPED_SUBJECT_FILTER
        ? null
        : groupings.find((item) => item.id === moveGroupingId);
    const targetName = grouping?.nameEn ?? t('subjects.ungrouped');
    if (
      !window.confirm(
        t('subjects.bulkMoveConfirm', {
          count: ids.length,
          grouping: targetName,
        }),
      )
    ) {
      return;
    }
    moveSubjectsToGrouping.mutate({
      subjectIds: ids,
      groupingId: grouping?.id ?? null,
    });
  };

  const handleAssignToClasses = (row: SubjectListRowView) => {
    const { subSystem, branch } = resolveSubjectStream(row);
    if (!subSystem || !branch) {
      window.alert(
        `"${row.nameEn}" is missing a valid sub-system or branch. Edit the subject before assigning classes.`,
      );
      return;
    }
    setAssignSubject(row);
  };

  return (
    <>
      <CatalogFilterBar filters={catalogFilters} onChange={setCatalogFilters} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Status</p>
          <Select
            value={listFilters.status}
            onValueChange={(value) =>
              setListFilters((current) => ({
                ...current,
                status: value as SubjectStatusFilter,
              }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Grouping</p>
          <Select
            value={listFilters.groupingId ?? ALL}
            onValueChange={(value) =>
              setListFilters((current) => ({
                ...current,
                groupingId: value === ALL ? null : value,
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All groupings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('subjects.allGroupings')}</SelectItem>
              <SelectItem value={UNGROUPED_SUBJECT_FILTER}>
                {t('subjects.ungrouped')}
              </SelectItem>
              {groupings.map((grouping) => (
                <SelectItem key={grouping.id} value={grouping.id}>
                  {grouping.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {t('students.level')}
          </p>
          <Select
            value={listFilters.levelId ?? ALL}
            onValueChange={(value) =>
              setListFilters((current) => ({
                ...current,
                levelId: value === ALL ? null : value,
              }))
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('academics.allLevels')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('academics.allLevels')}</SelectItem>
              {levelOptions.map((level) => (
                <SelectItem key={level.id} value={level.id!}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            checked={listFilters.allYears}
            onChange={(event) =>
              setListFilters((current) => ({
                ...current,
                allYears: event.target.checked,
              }))
            }
          />
          {t('subjects.allYears')}
        </label>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/subjects/groupings">{t('subjects.manageGroupings')}</Link>
          </Button>
          {canManage ? (
            <>
              <Select value={moveGroupingId} onValueChange={setMoveGroupingId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('subjects.grouping')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNGROUPED_SUBJECT_FILTER}>
                    {t('subjects.ungrouped')}
                  </SelectItem>
                  {groupings.map((grouping) => (
                    <SelectItem key={grouping.id} value={grouping.id}>
                      {grouping.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  filteredSubjects.length === 0 ||
                  moveSubjectsToGrouping.isPending
                }
                onClick={handleBulkMove}
              >
                {t('subjects.bulkMove')}
              </Button>
            </>
          ) : null}
        </div>
        <AdminToolbar
          className="mb-0"
          addLabel={t('subjects.newTitle')}
          onAdd={() => setSheetOpen(true)}
          canManage={canManage}
        />
      </div>

      <SubjectsTable
        catalogFilters={catalogFilters}
        listFilters={listFilters}
        emptyMessage={emptyMessage}
        onAssignToClasses={handleAssignToClasses}
      />

      <SubjectFormDialog open={sheetOpen} onOpenChange={setSheetOpen} />

      {assignSubject &&
      assignSubjectStream?.subSystem &&
      assignSubjectStream?.branch ? (
        <SubjectClassAssignDialog
          open={assignSubject !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAssignSubject(null);
            }
          }}
          subjectId={assignSubject.id}
          subjectCode={assignSubject.code}
          subjectName={assignSubject.nameEn}
          subSystem={assignSubjectStream.subSystem}
          branch={assignSubjectStream.branch}
          subjectDefaultGroupingId={assignSubject.groupingId}
          subjectDefaultGroupingName={
            assignSubject.SubjectGrouping?.nameEn ?? null
          }
          subBranches={assignSubject.SubjectSubBranch.map((branch) => ({
            id: branch.id,
            name: branch.name,
          }))}
        />
      ) : null}
    </>
  );
}
