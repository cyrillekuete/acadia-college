'use client';

import { useState } from 'react';
import type { StudentListItem } from '@/lib/acadia/student-list-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export function StudentDangerZone({
  student,
  isLoading,
}: {
  student: StudentListItem | undefined;
  isLoading: boolean;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (isLoading || !student) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-36" />
        <Card>
          <CardContent>
            <Skeleton className="mb-3 h-7 w-40" />
            <Skeleton className="mb-4 h-6 w-full max-w-[560px]" />
            <Skeleton className="h-9 w-28" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false);
    toast.info('Delete is not available in demo mode.');
  };

  return (
    <>
      <div className="space-y-3">
        <h2 className="font-semibold text-destructive">Danger Zone</h2>
        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">Delete student account</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              This action will permanently delete the student and all related data.
              It cannot be undone.
            </p>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              Delete student
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student account?</AlertDialogTitle>
            <AlertDialogDescription>
              Demo data only — no records will be removed. Connect Supabase to enable
              permanent deletion for {student.student_id}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              Delete student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
