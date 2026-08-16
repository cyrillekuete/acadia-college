'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
import { parseMoneyToMinor } from '@/lib/acadia/finance';
import {
  financeLedgerEntrySchema,
  type FinanceLedgerEntryFormValues,
} from '@/lib/acadia/finance-schemas';
import { useTranslation } from '@/hooks/useTranslation';

const LEDGER_FORM_ID = 'finance-ledger-entry-form';

const SHEET_CONTENT_CLASS =
  'p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5';

const EMPTY_VALUES: FinanceLedgerEntryFormValues = {
  academicYearId: '',
  entryType: 'INCOME',
  category: '',
  description: '',
  amountMinor: 0,
  currency: 'XAF',
  occurredOn: formatLocalDateInputValue(),
};

export function LedgerEntryFormSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { createLedgerEntry } = useFinanceMutations();
  const { activeYearId } = useActiveAcademicYear();
  const pending = createLedgerEntry.isPending;

  const form = useForm<FinanceLedgerEntryFormValues>({
    resolver: zodResolver(financeLedgerEntrySchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset({
      ...EMPTY_VALUES,
      academicYearId: activeYearId ?? '',
      occurredOn: formatLocalDateInputValue(),
    });
  }, [open, activeYearId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createLedgerEntry.mutateAsync({
        ...values,
        academicYearId: activeYearId!,
      });
      onOpenChange(false);
    } catch {
      // Toast is shown by the mutation.
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={SHEET_CONTENT_CLASS}>
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">{t('finance.addEntry')}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            id={LEDGER_FORM_ID}
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={onSubmit}
          >
            <SheetBody className="p-0">
              <ScrollArea className="h-[calc(100vh-10.5rem)]">
                <div className="space-y-4 px-5 py-2.5">
                  <FormField
                    control={form.control}
                    name="academicYearId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.year')}</FormLabel>
                        <CurrentAcademicYearBadge />
                        <FormControl>
                          <Input type="hidden" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="entryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.labels.type')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="INCOME">{t('finance.income')}</SelectItem>
                            <SelectItem value="EXPENSE">{t('finance.expense')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.category')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t('finance.categoryPlaceholder')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amountMinor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.amount')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ? field.value / 100 : ''}
                            onChange={(event) =>
                              field.onChange(parseMoneyToMinor(event.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="occurredOn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.labels.date')}</FormLabel>
                        <FormControl>
                          <DatePickerInput
                            value={field.value ?? ''}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.labels.description')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>
            </SheetBody>
            <SheetFooter className="border-t border-border p-5">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={pending || !activeYearId}>
                {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                {t('finance.addEntry')}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
