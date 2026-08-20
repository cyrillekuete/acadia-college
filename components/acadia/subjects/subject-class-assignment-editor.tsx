'use client';

import { useMemo } from 'react';
import { Trash2 } from '@/lib/icons';
import {
  type SubjectClassAssignment,
  SUBJECT_DEFAULT_GROUPING,
  UNGROUPED_GROUPING_OVERRIDE,
  formatAssignmentLabel,
  isSubBranchSelected,
  normalizeSubjectClassAssignments,
  setAssignmentGrouping,
  toggleClassSubBranch,
  toggleFullClass,
} from '@/lib/acadia/class-subject-selections';
import type { ClassForSubjectOption } from '@/hooks/use-classes-for-subject';
import { useSubjectGroupingOptions } from '@/hooks/use-subject-grouping-options';
import { useTranslation } from '@/hooks/useTranslation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SubjectClassAssignmentEditorProps = {
  subjectDefaultGroupingId: string | null;
  subjectDefaultGroupingName: string | null;
  subBranches: { id: string; name: string }[];
  classOptions: ClassForSubjectOption[];
  value: SubjectClassAssignment[];
  onChange: (value: SubjectClassAssignment[]) => void;
  disabled?: boolean;
};

export function assignmentsFromClassOptions(
  classOptions: ClassForSubjectOption[],
): SubjectClassAssignment[] {
  return classOptions
    .filter((option) => option.assignment)
    .map((option) => ({
      classId: option.id,
      subBranchIds: option.assignment!.subBranchIds,
      groupingId: option.assignment!.groupingId,
    }));
}

export function SubjectClassAssignmentEditor({
  subjectDefaultGroupingId: _subjectDefaultGroupingId,
  subjectDefaultGroupingName,
  subBranches,
  classOptions,
  value,
  onChange,
  disabled,
}: SubjectClassAssignmentEditorProps) {
  const { t } = useTranslation();
  const { data: groupings = [] } = useSubjectGroupingOptions();

  const groupingNames = useMemo(
    () => new Map(groupings.map((grouping) => [grouping.id, grouping.nameEn])),
    [groupings],
  );

  const optionById = useMemo(
    () => new Map(classOptions.map((option) => [option.id, option])),
    [classOptions],
  );

  const normalizedValue = useMemo(
    () =>
      normalizeSubjectClassAssignments(
        value,
        classOptions.map((option) => ({
          id: option.id,
          hasSubBranches: subBranches.length > 0,
          subBranches,
        })),
      ),
    [value, classOptions, subBranches],
  );

  const assignedClassIds = new Set(normalizedValue.map((assignment) => assignment.classId));

  const toggleClass = (classId: string, checked: boolean) => {
    onChange(toggleFullClass(normalizedValue, classId, checked));
  };

  const removeClass = (classId: string) => {
    onChange(normalizedValue.filter((assignment) => assignment.classId !== classId));
  };

  return (
    <div className="space-y-4">
      {normalizedValue.length > 0 ? (
        <div className="space-y-3">
          {normalizedValue.map((assignment) => {
            const classOption = optionById.get(assignment.classId);
            if (!classOption) {
              return null;
            }

            const defaultLabel = subjectDefaultGroupingName
              ? `Subject default (${subjectDefaultGroupingName})`
              : 'Subject default (none)';

            return (
              <div
                key={assignment.classId}
                className="space-y-3 rounded-lg border border-border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{classOption.name}</p>
                    {classOption.levelName ? (
                      <p className="text-xs text-muted-foreground">{classOption.levelName}</p>
                    ) : null}
                    <Badge variant="secondary" appearance="light">
                      {formatAssignmentLabel(classOption, assignment, subBranches, groupingNames)}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeClass(assignment.classId)}
                    disabled={disabled}
                    aria-label={`Remove ${classOption.name}`}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="shrink-0 text-xs text-muted-foreground">Grouping</Label>
                  <Select
                    value={assignment.groupingId ?? SUBJECT_DEFAULT_GROUPING}
                    onValueChange={(next) =>
                      onChange(
                        setAssignmentGrouping(
                          normalizedValue,
                          assignment.classId,
                          next === SUBJECT_DEFAULT_GROUPING
                            ? null
                            : next,
                        ),
                      )
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SUBJECT_DEFAULT_GROUPING}>{defaultLabel}</SelectItem>
                      {subjectDefaultGroupingId ? (
                        <SelectItem value={UNGROUPED_GROUPING_OVERRIDE}>
                          {t('subjects.ungrouped')}
                        </SelectItem>
                      ) : null}
                      {groupings.map((grouping) => (
                        <SelectItem key={grouping.id} value={grouping.id}>
                          {grouping.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {subBranches.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Sub-branches</Label>
                    <div className="space-y-2 ps-1">
                      {subBranches.map((branch) => {
                        const branchChecked = isSubBranchSelected(assignment, branch.id);
                        return (
                          <label
                            key={branch.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={branchChecked}
                              disabled={disabled}
                              onCheckedChange={(checked) =>
                                onChange(
                                  toggleClassSubBranch(
                                    normalizedValue,
                                    assignment.classId,
                                    branch.id,
                                    subBranches.map((item) => item.id),
                                    checked === true,
                                  ),
                                )
                              }
                            />
                            <span>{branch.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No classes assigned yet.</p>
      )}

      <div className="space-y-2">
        <Label className="text-sm">Add classes</Label>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
          {classOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No eligible classes for this subject and stream.
            </p>
          ) : (
            classOptions.map((classOption) => {
              const checked = assignedClassIds.has(classOption.id);
              return (
                <label key={classOption.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(next) => toggleClass(classOption.id, next === true)}
                  />
                  <span>
                    {classOption.name}
                    {classOption.levelName ? ` (${classOption.levelName})` : ''}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
