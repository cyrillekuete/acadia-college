'use client';

import { useState } from 'react';
import { LoaderCircleIcon } from '@/lib/icons';
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
import {
  FEE_PLAN_FORM_ID,
  FeePlanSetupForm,
} from '@/components/acadia/finance/fee-plan-setup-form';
import type { FeePlanRow } from '@/lib/acadia/finance';
import { useTranslation } from '@/hooks/useTranslation';

const SHEET_CONTENT_CLASS =
  'p-0 gap-0 sm:w-[640px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5';

export function FeePlanFormSheet({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: FeePlanRow | null;
}) {
  const { t } = useTranslation();
  const isEdit = !!record;
  const [pending, setPending] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={SHEET_CONTENT_CLASS}>
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">
            {isEdit ? t('finance.editFeePlan') : t('finance.addFeePlan')}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            <div className="px-5 py-2.5">
              {open ? (
                <FeePlanSetupForm
                  record={record}
                  hideActions
                  onCancel={() => onOpenChange(false)}
                  onPendingChange={setPending}
                  onSaved={() => onOpenChange(false)}
                />
              ) : null}
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.buttons.cancel')}
          </Button>
          <Button type="submit" form={FEE_PLAN_FORM_ID} disabled={pending}>
            {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            {isEdit ? t('common.buttons.save') : t('finance.saveFeePlan')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
