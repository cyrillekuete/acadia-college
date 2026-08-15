'use client';

import { useEffect, useState } from 'react';
import { LoaderCircleIcon, Pencil, Trash2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useClassTeacherAssignmentMutations } from '@/hooks/use-class-teacher-assignment-mutations';
import { useClassTeacherAssignments } from '@/hooks/use-class-teacher-assignments';
import {
  staffDisplayLabel,
  useClassSubjectOptions,
  useStaffOptions,
} from '@/hooks/use-subject-catalog-options';
import { useTranslation } from '@/hooks/useTranslation';

export function ClassTeacherAssignDialog({
  open,
  onOpenChange,
  classId,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string | null;
  className?: string | null;
}) {
  const { t } = useTranslation();
  const { activeYearId } = useActiveAcademicYear();
  const { data: staff = [] } = useStaffOptions({ enabled: open });
  const { data: classSubjects = [], isLoading: subjectsLoading } =
    useClassSubjectOptions(open ? classId : null);
  const { data: assignments = [], isLoading: assignmentsLoading } =
    useClassTeacherAssignments(open ? classId : null, activeYearId);
  const { syncAssignment, removeAssignment } = useClassTeacherAssignmentMutations();

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setEditingStaffId(null);
      setSelectedStaffId('');
      setSelectedSubjectIds([]);
    }
  }, [open]);

  const assignedStaffIds = new Set(assignments.map((row) => row.staffProfileId));
  const availableStaff = staff.filter(
    (member) =>
      !assignedStaffIds.has(member.id) || member.id === selectedStaffId,
  );

  const startAdd = () => {
    setEditingStaffId(null);
    setSelectedStaffId('');
    setSelectedSubjectIds([]);
  };

  const startEdit = (staffProfileId: string, subjectIds: string[]) => {
    setEditingStaffId(staffProfileId);
    setSelectedStaffId(staffProfileId);
    setSelectedSubjectIds(subjectIds);
  };

  const toggleSubject = (subjectId: string, checked: boolean) => {
    setSelectedSubjectIds((prev) => {
      if (checked) {
        return prev.includes(subjectId) ? prev : [...prev, subjectId];
      }
      return prev.filter((id) => id !== subjectId);
    });
  };

  const handleSave = () => {
    if (!classId || !activeYearId || !selectedStaffId) {
      return;
    }
    syncAssignment.mutate(
      {
        classId,
        academicYearId: activeYearId,
        staffProfileId: selectedStaffId,
        subjectIds: selectedSubjectIds,
      },
      {
        onSuccess: () => {
          startAdd();
        },
      },
    );
  };

  const handleRemove = (staffProfileId: string) => {
    if (!classId || !activeYearId) {
      return;
    }
    removeAssignment.mutate({
      classId,
      academicYearId: activeYearId,
      staffProfileId,
    });
  };

  const pending = syncAssignment.isPending || removeAssignment.isPending;
  const canSave = Boolean(classId && activeYearId && selectedStaffId) && !pending;
  const formOpen = selectedStaffId.length > 0 || editingStaffId !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">
            {t('academics.assignTeachersTitle', {
              name: className?.trim() || t('academics.className'),
            })}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            <div className="space-y-6 px-5 py-2.5">
              <p className="text-sm text-muted-foreground">
                {t('academics.assignTeachersDescription')}
              </p>
              <CurrentAcademicYearBadge label={t('academics.year')} />

              <div className="space-y-2">
                <p className="text-sm font-medium">{t('academics.assignedTeachers')}</p>
                {assignmentsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    {t('common.messages.loading')}
                  </p>
                ) : assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('academics.noTeachersAssigned')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((row) => {
                      const subjectLabel =
                        row.subjects.length > 0
                          ? row.subjects
                              .map((subject) => subject.code)
                              .join(', ')
                          : t('academics.noSubjectsAssigned');
                      return (
                        <div
                          key={row.staffProfileId}
                          className="flex items-start justify-between gap-2 rounded-md border p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {row.staffName}
                              {row.staffCode ? ` (${row.staffCode})` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {subjectLabel}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={pending}
                              onClick={() =>
                                startEdit(row.staffProfileId, row.subjectIds)
                              }
                              aria-label={t('academics.editTeacher')}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={pending}
                              onClick={() => handleRemove(row.staffProfileId)}
                              aria-label={t('academics.removeTeacher')}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <p className="text-sm font-medium">
                  {editingStaffId
                    ? t('academics.editTeacher')
                    : t('academics.addTeacher')}
                </p>
                <div className="space-y-2">
                  <Label>{t('staff.teacher')}</Label>
                  <Select
                    value={selectedStaffId}
                    onValueChange={setSelectedStaffId}
                    disabled={Boolean(editingStaffId)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('academics.selectTeacher')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStaff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {staffDisplayLabel(member)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {t('academics.subjectsInClass')}
                    </p>
                    {classSubjects.length > 0 ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-xs"
                          onClick={() =>
                            setSelectedSubjectIds(classSubjects.map((s) => s.id))
                          }
                        >
                          {t('academics.selectAll')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-xs"
                          onClick={() => setSelectedSubjectIds([])}
                        >
                          {t('academics.clearSelection')}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {subjectsLoading ? (
                    <p className="text-sm text-muted-foreground">
                      {t('common.messages.loading')}
                    </p>
                  ) : classSubjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('academics.noSubjectsOnClass')}
                    </p>
                  ) : (
                    <ScrollArea className="h-36 rounded-md border p-3">
                      <div className="space-y-2">
                        {classSubjects.map((subject) => {
                          const checked = selectedSubjectIds.includes(subject.id);
                          return (
                            <div key={subject.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`class-teacher-subject-${subject.id}`}
                                checked={checked}
                                onCheckedChange={(value) =>
                                  toggleSubject(subject.id, value === true)
                                }
                              />
                              <Label
                                htmlFor={`class-teacher-subject-${subject.id}`}
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

                {formOpen ? (
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={startAdd}>
                      {t('common.buttons.cancel')}
                    </Button>
                    <Button type="button" disabled={!canSave} onClick={handleSave}>
                      {syncAssignment.isPending ? (
                        <LoaderCircleIcon className="size-4 animate-spin" />
                      ) : null}
                      {t('academics.saveTeacherAssignment')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.buttons.close')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
