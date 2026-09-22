'use client';

import { useState } from 'react';
import { formatDateOnlyDisplay } from '@/lib/acadia/dates';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';

export type DeletedProfileRow = {
  id: string;
  name: string;
  code: string;
  deletedAt: string;
};

export function DeletedProfileList({
  rows,
  isLoading,
  idColumnLabel,
  emptyMessage,
  pendingId,
  onRestore,
  onPurge,
}: {
  rows: DeletedProfileRow[];
  isLoading: boolean;
  idColumnLabel: string;
  emptyMessage: string;
  pendingId: string | null;
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [purgeTarget, setPurgeTarget] = useState<DeletedProfileRow | null>(null);

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('common.labels.name')}</TableHead>
            <TableHead>{idColumnLabel}</TableHead>
            <TableHead>{t('registry.deletedAt')}</TableHead>
            <TableHead className="text-end">{t('common.labels.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const pending = pendingId === row.id;
            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.code}</TableCell>
                <TableCell>{formatDateOnlyDisplay(row.deletedAt)}</TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => onRestore(row.id)}
                    >
                      {t('registry.restore')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={() => setPurgeTarget(row)}
                    >
                      {t('registry.purge')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={purgeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPurgeTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('registry.purgeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('registry.purgeConfirmDescription', {
                name: purgeTarget?.name ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (purgeTarget) {
                  onPurge(purgeTarget.id);
                }
                setPurgeTarget(null);
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
