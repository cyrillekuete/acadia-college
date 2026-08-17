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
  CREATE_FEE_ACCOUNT_FORM_ID,
  CreateFeeAccountForm,
} from '@/components/acadia/finance/create-fee-account-form';
import { useTranslation } from '@/hooks/useTranslation';

export function CreateFeeAccountFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">{t('finance.newAccount')}</SheetTitle>
        </SheetHeader>
        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            <div className="px-5 py-2.5">
              {open ? (
                <CreateFeeAccountForm
                  hideActions
                  onCancel={() => onOpenChange(false)}
                  onPendingChange={setPending}
                  onCanSubmitChange={setCanSubmit}
                />
              ) : null}
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.buttons.cancel')}
          </Button>
          <Button
            type="submit"
            form={CREATE_FEE_ACCOUNT_FORM_ID}
            disabled={pending || !canSubmit}
          >
            {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            Create fee account
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
