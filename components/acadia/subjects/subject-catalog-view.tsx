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
import {
  DEFAULT_SUBJECT_LIST_FILTERS,
  type SubjectListFilters,
  type SubjectStatusFilter,
} from '@/lib/acadia/subject';
import { levelLabel, termLabel } from '@/lib/acadia/record-display';
import { useSubjectGroupingOptions } from '@/hooks/use-subject-grouping-options';
import { useSubjectList, type SubjectListRowView } from '@/hooks/use-subject-list';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { data: subjects = [] } = useSubjectList(catalogFilters, initialSubjects);

  const levelOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const row of subjects) {
      if (row.levelId && !map.has(row.levelId)) {
        map.set(row.levelId, { id: row.levelId, label: levelLabel(row.Level) });
      }
    }
    return Array.from(map.values());
  }, [subjects]);

  const termOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const row of subjects) {
      if (row.termId && !map.has(row.termId)) {
        map.set(row.termId, { id: row.termId, label: termLabel(row.Term) });
      }
    }
    return Array.from(map.values());
  }, [subjects]);

  const emptyMessage = buildEmptyMessage(catalogFilters, listFilters);

  const assignSubjectStream = useMemo(
    () => (assignSubject ? resolveSubjectStream(assignSubject) : null),
    [assignSubject],
  );
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
              <SelectItem value={ALL}>All groupings</SelectItem>
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
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {t('academics.term')}
          </p>
          <Select
            value={listFilters.termId ?? ALL}
            onValueChange={(value) =>
              setListFilters((current) => ({
                ...current,
                termId: value === ALL ? null : value,
              }))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('catalog.allTerms')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('catalog.allTerms')}</SelectItem>
              {termOptions.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/subjects/groupings">{t('subjects.manageGroupings')}</Link>
        </Button>
        <AdminToolbar
          className="mb-0"
          addLabel={t('subjects.newTitle')}
          onAdd={() => setSheetOpen(true)}
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
