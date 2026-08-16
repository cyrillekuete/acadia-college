'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatMoneyMinor, type FeePlanRow } from '@/lib/acadia/finance';
import { parseLocalDateInputValue } from '@/lib/acadia/dates';
import { useTranslation } from '@/hooks/useTranslation';

const SHEET_CONTENT_CLASS =
  'p-0 gap-0 sm:w-[560px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function formatDueOn(value: string | null): string {
  if (!value) {
    return '—';
  }
  const date = parseLocalDateInputValue(value);
  return date ? date.toLocaleDateString() : value;
}

export function FeePlanViewSheet({
  open,
  onOpenChange,
  record,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: FeePlanRow | null;
  onEdit?: (record: FeePlanRow) => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={SHEET_CONTENT_CLASS}>
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">{t('finance.viewFeePlan')}</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            {record ? (
              <div className="grid gap-4 px-5 py-2.5">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('nav.classes')}
                  </p>
                  {record.classes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {record.classes.map((row) => (
                        <Badge key={row.id} variant="secondary" appearance="light">
                          {row.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('finance.noClassesAssigned')}
                    </p>
                  )}
                </div>
                <Detail
                  label={t('finance.totalAmount')}
                  value={formatMoneyMinor(record.totalMinor)}
                />
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{t('finance.installments')}</p>
                  {record.installments.map((row) => (
                    <div
                      key={`${row.installmentNumber}-${row.labelEn}`}
                      className="rounded-lg border p-3"
                    >
                      <p className="text-sm font-medium">
                        {row.labelEn}
                        {row.labelFr ? ` / ${row.labelFr}` : ''}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatMoneyMinor(row.amountMinor)} · {formatDueOn(row.dueOn)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.buttons.close')}
          </Button>
          {record && onEdit ? (
            <Button
              type="button"
              onClick={() => {
                onEdit(record);
              }}
            >
              {t('common.buttons.edit')}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
