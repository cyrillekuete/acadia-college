'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  subjectMatchesClass,
  type ClassSubjectEligibilityClass,
  type ClassSubjectEligibilitySubject,
} from '@/lib/acadia/class-subject-eligibility';
import {
  branchLabel,
  subSystemLabel,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchSubjectLevelIds } from '@/lib/supabase/queries/subject-levels';
import { useAcademicStructureMutations } from '@/hooks/use-academic-structure-mutations';
import { useClassList, type ClassListRow } from '@/hooks/use-class-list';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useSubjectsForClass } from '@/hooks/use-subjects-for-class';

function classLevelName(row: ClassListRow): string {
  const level = row.Level;
  if (level?.name?.trim()) {
    return level.name.trim();
  }
  if (level?.number !== undefined) {
    return `Level ${level.number}`;
  }
  return '—';
}

export function ClassSubjectAssignDialog({
  open,
  onOpenChange,
  catalogFilters,
  initialClassIds = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogFilters: CatalogFilters;
  initialClassIds?: string[];
}) {
  const { assignClassSubjects } = useAcademicStructureMutations();
  const { activeYearId } = useActiveAcademicYear();
  const { data: session, isLoading: sessionLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const subSystem = catalogFilters.subSystem ?? 'ENGLISH';
  const branch = catalogFilters.branch ?? 'GRAMMAR';

  const { data: classes = [], isLoading: classesLoading } = useClassList({
    subSystem,
    branch,
  });

  useEffect(() => {
    if (!open) {
      setSelectedClassIds([]);
      setSelectedSubjectIds([]);
      return;
    }
    if (initialClassIds.length > 0) {
      setSelectedClassIds(initialClassIds);
    }
  }, [open, initialClassIds]);

  const selectedClasses = useMemo(
    () => classes.filter((c) => selectedClassIds.includes(c.id)),
    [classes, selectedClassIds],
  );

  const singleClass = selectedClasses.length === 1 ? selectedClasses[0] : null;

  const { data: singleClassSubjects = [], isLoading: singleSubjectsLoading } =
    useSubjectsForClass({
      levelId: singleClass?.levelId,
      subSystem,
      branch,
      academicYearId: activeYearId,
    });

  const { data: multiClassSubjects = [], isLoading: multiSubjectsLoading } = useQuery({
    queryKey: [
      'subjects-bulk-assign',
      tenantId,
      subSystem,
      branch,
      selectedClassIds,
      activeYearId,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('Subject')
        .select(
          `
          id,
          code,
          nameEn,
          subSystem,
          branch,
          levelId,
          academicYearId,
          termId,
          deactivatedAt,
          Term!Subject_semesterId_tenantId_fkey ( academicYearId )
        `,
        )
        .eq('tenantId', tenantId!)
        .is('deactivatedAt', null)
        .order('code', { ascending: true });

      if (error) {
        throw error;
      }

      const classRows: ClassSubjectEligibilityClass[] = selectedClasses.map((c) => ({
        id: c.id,
        levelId: c.levelId,
        subSystem: c.subSystem,
        branch: c.branch,
      }));

      const options: { id: string; code: string; nameEn: string }[] = [];

      for (const row of data ?? []) {
        const levelIds = await fetchSubjectLevelIds(supabase, tenantId!, row.id as string);
        const subject: ClassSubjectEligibilitySubject = {
          id: row.id as string,
          subSystem: row.subSystem as ClassSubjectEligibilitySubject['subSystem'],
          branch: row.branch as ClassSubjectEligibilitySubject['branch'],
          levelId: row.levelId as string,
          levelIds: levelIds.length > 0 ? levelIds : [row.levelId as string],
          academicYearId: row.academicYearId as string | null,
          termId: row.termId as string | null,
          deactivatedAt: row.deactivatedAt as string | null,
          Term: row.Term,
        };

        const matchesAny = classRows.some((classRow) =>
          subjectMatchesClass(subject, classRow, { academicYearId: activeYearId }),
        );
        if (matchesAny) {
          options.push({
            id: subject.id,
            code: row.code as string,
            nameEn: row.nameEn as string,
          });
        }
      }

      return options;
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, isError, session, tenantId) &&
      selectedClasses.length > 1 &&
      open,
  });

  const subjectOptions =
    selectedClasses.length === 1 ? singleClassSubjects : multiClassSubjects;
  const subjectsLoading =
    selectedClasses.length === 1 ? singleSubjectsLoading : multiSubjectsLoading;

  const toggleClass = (classId: string, checked: boolean) => {
    setSelectedClassIds((prev) => {
      if (checked) {
        return prev.includes(classId) ? prev : [...prev, classId];
      }
      return prev.filter((id) => id !== classId);
    });
    setSelectedSubjectIds([]);
  };

  const toggleSubject = (subjectId: string, checked: boolean) => {
    setSelectedSubjectIds((prev) => {
      if (checked) {
        return prev.includes(subjectId) ? prev : [...prev, subjectId];
      }
      return prev.filter((id) => id !== subjectId);
    });
  };

  const handleAssign = () => {
    assignClassSubjects.mutate(
      {
        classIds: selectedClassIds,
        subjectIds: selectedSubjectIds,
        academicYearId: activeYearId,
      },
      {
        onSuccess: (result) => {
          if (result.added > 0) {
            onOpenChange(false);
          }
        },
      },
    );
  };

  const pending = assignClassSubjects.isPending;
  const canSubmit =
    selectedClassIds.length > 0 && selectedSubjectIds.length > 0 && !pending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">Assign subjects to classes</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            <div className="space-y-6 px-5 py-2.5">
          <p className="text-sm text-muted-foreground">
            {subSystemLabel(subSystem)} · {branchLabel(branch)}. Existing class–subject links
            are kept; only new pairs are added.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Classes</p>
              {classes.length > 0 ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() =>
                      setSelectedClassIds(classes.map((c) => c.id))
                    }
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() => {
                      setSelectedClassIds([]);
                      setSelectedSubjectIds([]);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              ) : null}
            </div>
            {classesLoading ? (
              <p className="text-sm text-muted-foreground">Loading classes…</p>
            ) : classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classes match the current filters.
              </p>
            ) : (
              <ScrollArea className="h-36 rounded-md border p-3">
                <div className="space-y-2">
                  {classes.map((classRow) => {
                    const checked = selectedClassIds.includes(classRow.id);
                    return (
                      <div key={classRow.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`assign-class-${classRow.id}`}
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleClass(classRow.id, value === true)
                          }
                        />
                        <Label
                          htmlFor={`assign-class-${classRow.id}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {classRow.name} · {classLevelName(classRow)}
                          {classRow.subjectCount > 0
                            ? ` (${classRow.subjectCount} subject${classRow.subjectCount === 1 ? '' : 's'})`
                            : ''}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Subjects</p>
              {subjectOptions.length > 0 ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() =>
                      setSelectedSubjectIds(subjectOptions.map((s) => s.id))
                    }
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() => setSelectedSubjectIds([])}
                  >
                    Clear
                  </Button>
                </div>
              ) : null}
            </div>
            {selectedClassIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Select at least one class first.</p>
            ) : subjectsLoading ? (
              <p className="text-sm text-muted-foreground">Loading subjects…</p>
            ) : subjectOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No subjects available for the selected class(es). Check subject levels and
                academic stream.
              </p>
            ) : (
              <ScrollArea className="h-36 rounded-md border p-3">
                <div className="space-y-2">
                  {subjectOptions.map((subject) => {
                    const checked = selectedSubjectIds.includes(subject.id);
                    return (
                      <div key={subject.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`assign-subject-${subject.id}`}
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleSubject(subject.id, value === true)
                          }
                        />
                        <Label
                          htmlFor={`assign-subject-${subject.id}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {subject.code} — {subject.nameEn}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {selectedClassIds.length > 0 && selectedSubjectIds.length > 0 ? (
            <p className="text-sm text-foreground">
              Assign {selectedSubjectIds.length} subject
              {selectedSubjectIds.length === 1 ? '' : 's'} to {selectedClassIds.length}{' '}
              class
              {selectedClassIds.length === 1 ? '' : 'es'}.
            </p>
          ) : null}
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleAssign}>
            {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            Assign subjects
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
