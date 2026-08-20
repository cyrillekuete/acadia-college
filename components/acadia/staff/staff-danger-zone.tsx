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
import { useStaffMutations } from '@/hooks/use-staff-mutations';
import { useTranslation } from '@/hooks/useTranslation';

export function StaffDangerZone({
  staffProfileId,
  staffCode,
  isActive,
  isLoading,
}: {
  staffProfileId: string | undefined;
  staffCode: string | null | undefined;
  isActive: boolean | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { deactivateStaff } = useStaffMutations();

  if (isLoading || !staffProfileId) {
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

  if (!isActive) {
    return null;
  }

  const handleConfirm = () => {
    deactivateStaff.mutate(
      { profileId: staffProfileId },
      { onSuccess: () => setDialogOpen(false) },
    );
  };

  return (
    <>
      <div className="space-y-3">
        <h2 className="font-semibold text-destructive">{t('staff.dangerZone')}</h2>
        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold">{t('staff.deactivateTitle')}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('staff.deactivateDescription')}
            </p>
            <Button
              variant="destructive"
              disabled={deactivateStaff.isPending}
              onClick={() => setDialogOpen(true)}
            >
              {t('staff.deactivateButton')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('staff.deactivateConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('staff.deactivateConfirmDescription', {
                staffCode: staffCode ?? staffProfileId,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deactivateStaff.isPending}
              onClick={handleConfirm}
            >
              {t('staff.deactivateButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
