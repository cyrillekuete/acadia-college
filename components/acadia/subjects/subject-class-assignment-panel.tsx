'use client';

import { useEffect, useMemo, useState } from 'react';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import type { SubjectClassAssignment } from '@/lib/acadia/class-subject-selections';
import { resolveEffectiveGrouping } from '@/lib/acadia/class-subject-selections';
import { formatRecordValue } from '@/lib/acadia/record-display';
import { useClassesForSubject } from '@/hooks/use-classes-for-subject';
import { useSubjectClassAssignmentMutations } from '@/hooks/use-subject-class-assignment-mutations';
import { useSubjectGroupingOptions } from '@/hooks/use-subject-grouping-options';
import {
  SubjectClassAssignmentEditor,
  assignmentsFromClassOptions,
} from '@/components/acadia/subjects/subject-class-assignment-editor';
import { Skeleton } from '@/components/ui/skeleton';

export function SubjectClassAssignmentPanel({
  subjectId,
  subSystem,
  branch,
  subjectDefaultGroupingId,
  subjectDefaultGroupingName,
  subBranches,
  canManage = true,
}: {
  subjectId: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  subjectDefaultGroupingId: string | null;
  subjectDefaultGroupingName: string | null;
  subBranches: { id: string; name: string }[];
  canManage?: boolean;
}) {
  const { activeYearId } = useActiveAcademicYear();
  const { syncAssignments } = useSubjectClassAssignmentMutations();
  const { data: groupings = [] } = useSubjectGroupingOptions();
  const [assignments, setAssignments] = useState<SubjectClassAssignment[]>([]);
  const [dirty, setDirty] = useState(false);

  const {
    data: classOptions = [],
    isLoading,
    isError,
    error,
  } = useClassesForSubject({
    subjectId,
    subSystem,
    branch,
    levelIds: [],
    academicYearId: activeYearId,
  });

  useEffect(() => {
    setAssignments(assignmentsFromClassOptions(classOptions));
    setDirty(false);
  }, [classOptions]);

  const groupingNames = useMemo(
    () => new Map(groupings.map((grouping) => [grouping.id, grouping.nameEn])),
    [groupings],
  );

  const assignedSummary = useMemo(() => {
    if (assignments.length === 0) {
      return '—';
    }
    return assignments
      .map((assignment) => {
        const classOption = classOptions.find((option) => option.id === assignment.classId);
        if (!classOption) {
          return null;
        }
        const effectiveGroupingId = resolveEffectiveGrouping(
          assignment,
          subjectDefaultGroupingId,
        );
        const groupingLabel = effectiveGroupingId
          ? groupingNames.get(effectiveGroupingId) ?? 'Grouping'
          : 'No grouping';
        return `${classOption.name} (${groupingLabel})`;
      })
      .filter(Boolean)
      .join(', ');
  }, [
    assignments,
    classOptions,
    groupingNames,
    subjectDefaultGroupingId,
  ]);

  const handleSave = () => {
    syncAssignments.mutate(
      { subjectId, assignments },
      {
        onSuccess: () => setDirty(false),
      },
    );
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : 'Failed to load class assignments.'}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <RecordDetailCard
        title="Class assignments"
        fields={[
          { label: 'Assigned classes', value: formatRecordValue(String(assignments.length)) },
          { label: 'Summary', value: formatRecordValue(assignedSummary) },
        ]}
      />

      {canManage ? (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <SubjectClassAssignmentEditor
            subjectDefaultGroupingId={subjectDefaultGroupingId}
            subjectDefaultGroupingName={subjectDefaultGroupingName}
            subBranches={subBranches}
            classOptions={classOptions}
            value={assignments}
            onChange={(next) => {
              setAssignments(next);
              setDirty(true);
            }}
            disabled={syncAssignments.isPending}
          />

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSave}
              disabled={!dirty || syncAssignments.isPending}
            >
              {syncAssignments.isPending ? (
                <>
                  <LoaderCircleIcon className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save class assignments'
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
