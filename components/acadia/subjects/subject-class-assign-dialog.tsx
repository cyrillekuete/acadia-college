'use client';

import { useEffect, useState } from 'react';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import type { SubjectClassAssignment } from '@/lib/acadia/class-subject-selections';
import { useClassesForSubject } from '@/hooks/use-classes-for-subject';
import { useSubjectClassAssignmentMutations } from '@/hooks/use-subject-class-assignment-mutations';
import {
  SubjectClassAssignmentEditor,
  assignmentsFromClassOptions,
} from '@/components/acadia/subjects/subject-class-assignment-editor';

export function SubjectClassAssignDialog({
  open,
  onOpenChange,
  subjectId,
  subjectCode,
  subjectName,
  subSystem,
  branch,
  subjectDefaultGroupingId,
  subjectDefaultGroupingName,
  subBranches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  subSystem: AcademicSubSystem;
  branch: AcademicBranch;
  subjectDefaultGroupingId: string | null;
  subjectDefaultGroupingName: string | null;
  subBranches: { id: string; name: string }[];
}) {
  const { activeYearId } = useActiveAcademicYear();
  const { syncAssignments } = useSubjectClassAssignmentMutations();
  const [assignments, setAssignments] = useState<SubjectClassAssignment[]>([]);

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
    if (!open) {
      setAssignments([]);
      return;
    }
    setAssignments(assignmentsFromClassOptions(classOptions));
  }, [open, classOptions]);

  const handleSave = () => {
    syncAssignments.mutate(
      { subjectId, assignments },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Assign to classes — {subjectCode} ({subjectName})
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading eligible classes…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load classes.'}
            </p>
          ) : (
            <SubjectClassAssignmentEditor
              subjectDefaultGroupingId={subjectDefaultGroupingId}
              subjectDefaultGroupingName={subjectDefaultGroupingName}
              subBranches={subBranches}
              classOptions={classOptions}
              value={assignments}
              onChange={setAssignments}
              disabled={syncAssignments.isPending}
            />
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={syncAssignments.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isError || syncAssignments.isPending}
          >
            {syncAssignments.isPending ? (
              <>
                <LoaderCircleIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save assignments'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
