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
  deletedAt,
  isLoading,
}: {
  staffProfileId: string | undefined;
  staffCode: string | null | undefined;
  isActive: boolean | undefined;
  deletedAt: string | null | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const { deactivateStaff, softDeleteStaff, restoreStaff, purgeStaff } =
    useStaffMutations();
  const label = staffCode ?? staffProfileId ?? '';
  const isDeleted = Boolean(deletedAt);

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

  return (
    <>
      <div className="space-y-3">
        <h2 className="font-semibold text-destructive">{t('staff.dangerZone')}</h2>
        {isDeleted ? (
          <Card>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-3 font-semibold">{t('staff.deletedTitle')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('staff.deletedDescription')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={restoreStaff.isPending}
                  onClick={() => restoreStaff.mutate({ profileId: staffProfileId })}
                >
                  {t('registry.restore')}
                </Button>
                <Button
                  variant="destructive"
                  disabled={purgeStaff.isPending}
                  onClick={() => setPurgeOpen(true)}
                >
                  {t('registry.purge')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {isActive ? (
              <Card>
                <CardContent>
                  <h3 className="mb-3 font-semibold">{t('staff.deactivateTitle')}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {t('staff.deactivateDescription')}
                  </p>
                  <Button
                    variant="destructive"
                    disabled={deactivateStaff.isPending}
                    onClick={() => setDeactivateOpen(true)}
                  >
                    {t('staff.deactivateButton')}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
            <Card>
              <CardContent>
                <h3 className="mb-3 font-semibold">{t('staff.softDeleteTitle')}</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {t('staff.softDeleteDescription')}
                </p>
                <Button
                  variant="destructive"
                  disabled={softDeleteStaff.isPending}
                  onClick={() => setDeleteOpen(true)}
                >
                  {t('staff.softDeleteButton')}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('staff.deactivateConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('staff.deactivateConfirmDescription', { staffCode: label })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deactivateStaff.isPending}
              onClick={() =>
                deactivateStaff.mutate(
                  { profileId: staffProfileId },
                  { onSuccess: () => setDeactivateOpen(false) },
                )
              }
            >
              {t('staff.deactivateButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('staff.softDeleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('staff.softDeleteConfirmDescription', { staffCode: label })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={softDeleteStaff.isPending}
              onClick={() =>
                softDeleteStaff.mutate(
                  { profileId: staffProfileId },
                  { onSuccess: () => setDeleteOpen(false) },
                )
              }
            >
              {t('staff.softDeleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('registry.purgeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('registry.purgeConfirmDescription', { name: label })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={purgeStaff.isPending}
              onClick={() =>
                purgeStaff.mutate(
                  { profileId: staffProfileId },
                  { onSuccess: () => setPurgeOpen(false) },
                )
              }
            >
              {t('registry.purge')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
