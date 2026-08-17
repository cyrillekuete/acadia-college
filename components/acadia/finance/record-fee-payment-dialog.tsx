'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  formatMoneyMinor,
  parseMoneyToMinor,
  remainingInstallmentMinor,
} from '@/lib/acadia/finance';
import { parseLocalDateInputValue } from '@/lib/acadia/dates';
import { useTranslation } from '@/hooks/useTranslation';

export type PayableInstallment = {
  id: string;
  labelEn: string;
  amountMinor: number;
  dueOn: string;
  status: string;
  paidAmountMinor: number | null;
};

function formatDueOn(value: string): string {
  const date = parseLocalDateInputValue(value);
  return date ? date.toLocaleDateString() : value;
}

export function RecordFeePaymentDialog({
  installment,
  accountRemainingMinor,
  currency,
  open,
  pending,
  onOpenChange,
  onSubmit,
}: {
  installment: PayableInstallment | null;
  accountRemainingMinor: number;
  currency: string;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { amountMinor: number; notes: string }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const remaining = installment
    ? remainingInstallmentMinor(installment)
    : 0;
  const accountRemaining = Math.max(0, accountRemainingMinor);
  const [amountMajor, setAmountMajor] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open || !installment) {
      return;
    }
    const remainingMajor = remainingInstallmentMinor(installment) / 100;
    setAmountMajor(remainingMajor > 0 ? String(remainingMajor) : '');
    setNotes('');
  }, [installment, open]);

  const handleSubmit = async () => {
    const thisPayment = parseMoneyToMinor(amountMajor);
    if (thisPayment <= 0) {
      toast.error(t('validation.amountPositive'));
      return;
    }
    const capped = Math.min(thisPayment, accountRemaining);
    if (capped <= 0) {
      toast.error(t('validation.amountPositive'));
      return;
    }
    try {
      await onSubmit({ amountMinor: capped, notes });
    } catch {
      // Mutation already toasts the error; keep the dialog open.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('finance.addPayment')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {installment ? (
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t('finance.installment')}
                </span>
                <span className="font-medium">{installment.labelEn}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">{t('finance.due')}</span>
                <span>{formatDueOn(installment.dueOn)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t('finance.remaining')}
                </span>
                <span className="font-medium">
                  {formatMoneyMinor(remaining, currency)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t('finance.accountRemaining')}
                </span>
                <span className="font-medium">
                  {formatMoneyMinor(accountRemaining, currency)}
                </span>
              </div>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="fee-payment-amount">{t('finance.paymentAmount')}</Label>
            <Input
              id="fee-payment-amount"
              type="number"
              min={0}
              step="1"
              value={amountMajor}
              onChange={(e) => setAmountMajor(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('finance.paymentOverflowHint')}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee-payment-notes">{t('finance.paymentNotes')}</Label>
            <Input
              id="fee-payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('finance.paymentNotesPlaceholder')}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {t('common.buttons.cancel')}
          </Button>
          <Button
            type="button"
            disabled={pending || accountRemaining <= 0}
            onClick={() => void handleSubmit()}
          >
            {t('finance.recordPayment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
