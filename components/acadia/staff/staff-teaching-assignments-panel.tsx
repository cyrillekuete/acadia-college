'use client';

import { useState } from 'react';
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
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { useClassList } from '@/hooks/use-class-list';
import { useClassTeacherAssignmentMutations } from '@/hooks/use-class-teacher-assignment-mutations';
import { useStaffTeachingAssignments } from '@/hooks/use-class-teacher-assignments';
import { useClassSubjectOptions } from '@/hooks/use-subject-catalog-options';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { hasClassTeacherSubjects } from '@/lib/acadia/staff-class-assignments';

export function StaffTeachingAssignmentsPanel({
  staffProfileId,
}: {
  staffProfileId: string;
}) {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const { activeYearId } = useActiveAcademicYear();
  const { data: assignments = [], isLoading } = useStaffTeachingAssignments(
    staffProfileId,
    activeYearId,
  );
  const { data: classes = [] } = useClassList();
  const { syncAssignment, removeAssignment } = useClassTeacherAssignmentMutations();

  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const { data: classSubjects = [], isLoading: subjectsLoading } =
    useClassSubjectOptions(selectedClassId || null);

  const assignedClassIds = new Set(assignments.map((row) => row.classId));
  const availableClasses = classes.filter(
    (classRow) =>
      !assignedClassIds.has(classRow.id) || classRow.id === selectedClassId,
  );

  const startAdd = () => {
    setEditingClassId(null);
    setSelectedClassId('');
    setSelectedSubjectIds([]);
  };

  const startEdit = (classId: string, subjectIds: string[]) => {
    setEditingClassId(classId);
    setSelectedClassId(classId);
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
    if (!activeYearId || !selectedClassId) {
      return;
    }
    syncAssignment.mutate(
      {
        classId: selectedClassId,
        academicYearId: activeYearId,
        staffProfileId,
        subjectIds: selectedSubjectIds,
      },
      {
        onSuccess: () => startAdd(),
      },
    );
  };

  const handleRemove = (classId: string) => {
    if (!activeYearId) {
      return;
    }
    removeAssignment.mutate({
      classId,
      academicYearId: activeYearId,
      staffProfileId,
    });
  };

  const pending = syncAssignment.isPending || removeAssignment.isPending;
  const canSave =
    Boolean(activeYearId && selectedClassId) &&
    hasClassTeacherSubjects(selectedSubjectIds) &&
    !pending;

  return (
    <div className="space-y-5">
      <RecordDetailCard
        title={t('staff.teachingAssignments')}
        fields={
          isLoading
            ? [{ label: t('academics.year'), value: t('common.messages.loading') }]
            : assignments.length === 0
              ? [
                  {
                    label: t('staff.classesToTeach'),
                    value: t('staff.noTeachingAssignments'),
                  },
                ]
              : assignments.map((row) => ({
                  label: row.className,
                  value: (
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        {row.subjects.length > 0
                          ? row.subjects
                              .map((subject) => `${subject.code} — ${subject.nameEn}`)
                              .join(', ')
                          : t('academics.noSubjectsAssigned')}
                      </span>
                      {canManage ? (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={pending}
                            onClick={() => startEdit(row.classId, row.subjectIds)}
                            aria-label={t('common.buttons.edit')}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={pending}
                            onClick={() => handleRemove(row.classId)}
                            aria-label={t('common.buttons.remove')}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ),
                }))
        }
      />

      {canManage ? (
        <div className="space-y-4 rounded-lg border p-4">
          <CurrentAcademicYearBadge label={t('academics.year')} />
          <p className="text-sm font-medium">
            {editingClassId
              ? t('staff.editClassAssignment')
              : t('staff.addClassAssignment')}
          </p>
          <div className="space-y-2">
            <Label>{t('staff.classesToTeach')}</Label>
            <Select
              value={selectedClassId}
              onValueChange={(value) => {
                setSelectedClassId(value);
                if (value !== editingClassId) {
                  setSelectedSubjectIds([]);
                }
              }}
              disabled={Boolean(editingClassId)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('staff.selectClass')} />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((classRow) => (
                  <SelectItem key={classRow.id} value={classRow.id}>
                    {classRow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t('academics.subjectsInClass')}</p>
            {!selectedClassId ? (
              <p className="text-sm text-muted-foreground">
                {t('staff.selectClassFirst')}
              </p>
            ) : subjectsLoading ? (
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
                          id={`staff-class-subject-${subject.id}`}
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleSubject(subject.id, value === true)
                          }
                        />
                        <Label
                          htmlFor={`staff-class-subject-${subject.id}`}
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

          <div className="flex justify-end gap-2">
            {editingClassId || selectedClassId ? (
              <Button type="button" variant="outline" onClick={startAdd}>
                {t('common.buttons.cancel')}
              </Button>
            ) : null}
            <Button type="button" disabled={!canSave} onClick={handleSave}>
              {syncAssignment.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              {t('academics.saveTeacherAssignment')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
