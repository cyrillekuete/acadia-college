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
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useStudentMutations } from '@/hooks/use-student-mutations';
import { useTranslation } from '@/hooks/useTranslation';

export function StudentDangerZone({
  student,
  isLoading,
}: {
  student: StudentListItem | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const { activeYearId, activeYear } = useActiveAcademicYear();
  const { withdrawStudent } = useStudentMutations();
  const profileId = student?.id;

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

  const handleConfirmWithdraw = () => {
    if (!profileId || !activeYearId) {
      return;
    }
    withdrawStudent.mutate(
      {
        profileId,
        academicYearId: activeYearId,
        deactivateProfile: true,
      },
      { onSuccess: () => setWithdrawDialogOpen(false) },
    );
  };

  return (
    <>
      <div className="space-y-3">
        <h2 className="font-semibold text-destructive">{t('students.dangerZone')}</h2>
        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">{t('students.withdrawTitle')}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('students.withdrawDescription', {
                year: activeYear?.label ?? t('students.academicYear'),
              })}
            </p>
            <Button
              variant="destructive"
              disabled={!activeYearId || withdrawStudent.isPending}
              onClick={() => setWithdrawDialogOpen(true)}
            >
              {t('students.withdrawButton')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('students.withdrawConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.withdrawConfirmDescription', {
                studentId: student.student_id,
                year: activeYear?.label ?? t('students.academicYear'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={withdrawStudent.isPending}
              onClick={handleConfirmWithdraw}
            >
              {t('students.withdrawButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
