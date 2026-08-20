'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatMoneyMinor, type ExpenditureRow } from '@/lib/acadia/finance';
import { useTranslation } from '@/hooks/useTranslation';

const SHEET_CONTENT_CLASS =
  'p-0 gap-0 sm:w-[480px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function expenditureStatusVariant(status: string) {
  if (status === 'PAID') {
    return 'success' as const;
  }
  if (status === 'REJECTED') {
    return 'destructive' as const;
  }
  if (status === 'APPROVED') {
    return 'info' as const;
  }
  return 'warning' as const;
}

export function ExpenditureViewSheet({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ExpenditureRow | null;
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={SHEET_CONTENT_CLASS}>
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">{t('finance.viewExpenditure')}</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            {record ? (
              <div className="grid gap-4 px-5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <Detail label={t('common.labels.title')} value={record.title} />
                  <Badge
                    variant={expenditureStatusVariant(record.status)}
                    appearance="light"
                  >
                    {t(`finance.expenditureStatus.${record.status}`)}
                  </Badge>
                </div>
                <Detail
                  label={t('common.labels.description')}
                  value={record.description?.trim() || '—'}
                />
                <Detail
                  label={t('finance.category')}
                  value={t(`finance.expenditureCategory.${record.category}`)}
                />
                <Detail
                  label={t('finance.amount')}
                  value={formatMoneyMinor(record.amountMinor, record.currency)}
                />
                <Detail
                  label={t('finance.paymentMethod')}
                  value={
                    record.paymentMethod
                      ? t(`finance.paymentMethodValue.${record.paymentMethod}`)
                      : '—'
                  }
                />
                <Detail label={t('finance.vendor')} value={record.vendor} />
                <Detail
                  label={t('finance.vendorContact')}
                  value={record.vendorContact?.trim() || '—'}
                />
                <Detail
                  label={t('finance.paymentDate')}
                  value={record.paymentDate ?? '—'}
                />
                <Detail
                  label={t('finance.receiptNumber')}
                  value={record.receiptNumber?.trim() || '—'}
                />
                <Detail
                  label={t('finance.invoiceNumber')}
                  value={record.invoiceNumber?.trim() || '—'}
                />
                <Detail
                  label={t('finance.budgetCategory')}
                  value={record.budgetCategory ?? '—'}
                />
                <Detail
                  label={t('finance.department')}
                  value={record.department?.trim() || '—'}
                />
                <Detail
                  label={t('common.labels.notes')}
                  value={record.notes?.trim() || '—'}
                />
              </div>
            ) : null}
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.buttons.close')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
