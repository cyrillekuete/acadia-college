'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download, LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
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
import { downloadFamilyCredentials } from '@/lib/acadia/download-credentials';
import { useStudentCredentialsMutation } from '@/hooks/use-student-credentials-mutation';
import { useTranslation } from '@/hooks/useTranslation';

export function StudentDownloadCredentialsButton({
  profileId,
}: {
  profileId: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const mutation = useStudentCredentialsMutation();

  async function handleConfirm() {
    const result = await mutation.mutateAsync(profileId).catch((err: Error) => {
      toast.error(err.message ?? t('students.downloadCredentialsFailed'));
      return null;
    });

    if (!result) return;

    const signInUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/signin`
        : '/signin';

    downloadFamilyCredentials({
      studentId: result.studentId,
      studentLoginEmail: result.studentLoginEmail,
      studentTemporaryPassword: result.studentTemporaryPassword,
      parentCode: result.parentCode,
      parentLoginEmail: result.parentLoginEmail,
      parentTemporaryPassword: result.parentTemporaryPassword,
      signInUrl,
    });

    toast.success(t('students.downloadCredentialsToast'));
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download className="size-4" />
        {t('students.downloadCredentials')}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="md:max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('students.downloadCredentialsTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.downloadCredentialsDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>
              {t('common.buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirm();
              }}
            >
              {mutation.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              {t('students.downloadCredentialsConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
