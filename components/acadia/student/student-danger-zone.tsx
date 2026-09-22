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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const { activeYearId, activeYear } = useActiveAcademicYear();
  const { withdrawStudent, softDeleteStudent, restoreStudent, purgeStudent } =
    useStudentMutations();
  const profileId = student?.id;
  const isDeleted = Boolean(student?.deletedAt);

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
        {isDeleted ? (
          <Card>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-3 font-semibold">{t('students.deletedTitle')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('students.deletedDescription')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!profileId || restoreStudent.isPending}
                  onClick={() => {
                    if (profileId) {
                      restoreStudent.mutate({ profileId });
                    }
                  }}
                >
                  {t('registry.restore')}
                </Button>
                <Button
                  variant="destructive"
                  disabled={!profileId || purgeStudent.isPending}
                  onClick={() => setPurgeDialogOpen(true)}
                >
                  {t('registry.purge')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
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
            <Card>
              <CardContent>
                <h3 className="mb-3 font-semibold">{t('students.softDeleteTitle')}</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {t('students.softDeleteDescription')}
                </p>
                <Button
                  variant="destructive"
                  disabled={!profileId || softDeleteStudent.isPending}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  {t('students.softDeleteButton')}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('students.softDeleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.softDeleteConfirmDescription', {
                studentId: student.student_id,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={softDeleteStudent.isPending}
              onClick={() => {
                if (!profileId) {
                  return;
                }
                softDeleteStudent.mutate(
                  { profileId },
                  { onSuccess: () => setDeleteDialogOpen(false) },
                );
              }}
            >
              {t('students.softDeleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('registry.purgeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('registry.purgeConfirmDescription', {
                name: student.student_id,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={purgeStudent.isPending}
              onClick={() => {
                if (!profileId) {
                  return;
                }
                purgeStudent.mutate(
                  { profileId },
                  { onSuccess: () => setPurgeDialogOpen(false) },
                );
              }}
            >
              {t('registry.purge')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
