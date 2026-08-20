'use client';

import { useState } from 'react';
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
import { useAssessmentMutations } from '@/hooks/use-assessment-mutations';
import { hasExamSessionDeleteBlockers } from '@/lib/acadia/exam-session-guards';
import { useTranslation } from '@/hooks/useTranslation';

export function ExamSessionDangerZone({
  examSessionId,
  finalizedAt,
  markCount,
  isLoading,
}: {
  examSessionId: string | undefined;
  finalizedAt: string | null | undefined;
  markCount: number;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { deleteExamSession } = useAssessmentMutations();
  const blocked = hasExamSessionDeleteBlockers({
    marks: markCount,
    finalized: Boolean(finalizedAt),
  });

  if (isLoading || !examSessionId) {
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

  return (
    <>
      <div className="space-y-3">
        <h2 className="font-semibold text-destructive">{t('exams.dangerZone')}</h2>
        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">{t('exams.deleteTitle')}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('exams.deleteDescription')}
            </p>
            <Button
              variant="destructive"
              disabled={blocked || deleteExamSession.isPending}
              onClick={() => setDialogOpen(true)}
            >
              {t('common.buttons.delete')}
            </Button>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('exams.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteExamSession.mutate(examSessionId, {
                  onSuccess: () => setDialogOpen(false),
                });
              }}
            >
              {t('common.buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
