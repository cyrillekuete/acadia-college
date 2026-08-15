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
import { formatMoneyMinor, type FinanceSaleRow } from '@/lib/acadia/finance';
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

export function SalesViewSheet({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: FinanceSaleRow | null;
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={SHEET_CONTENT_CLASS}>
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">{t('finance.viewSale')}</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            {record ? (
              <div className="grid gap-4 px-5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <Detail label={t('finance.selectStudent')} value={record.studentLabel} />
                  <Badge
                    variant={
                      record.status === 'COMPLETED'
                        ? 'success'
                        : record.status === 'CANCELLED'
                          ? 'destructive'
                          : 'warning'
                    }
                    appearance="light"
                  >
                    {t(`finance.saleStatus.${record.status}`)}
                  </Badge>
                </div>
                <Detail
                  label={t('finance.itemType')}
                  value={t(`finance.saleItemType.${record.itemType}`)}
                />
                <Detail label={t('finance.itemName')} value={record.itemName} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Detail label={t('finance.quantity')} value={String(record.quantity)} />
                  <Detail
                    label={t('finance.unitPrice')}
                    value={formatMoneyMinor(record.unitPriceMinor)}
                  />
                </div>
                <Detail
                  label={t('finance.totalAmount')}
                  value={formatMoneyMinor(record.totalMinor)}
                />
                <Detail label={t('finance.saleDate')} value={record.saleDate} />
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
