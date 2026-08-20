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
import { Textarea } from '@/components/ui/textarea';
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
import {
  DEFAULT_FEE_CURRENCY,
  FINANCE_LEDGER_TYPES,
  parseMoneyToMinor,
} from '@/lib/acadia/finance';
import {
  financeLedgerEntrySchema,
  type FinanceLedgerEntryFormValues,
} from '@/lib/acadia/finance-schemas';
import { useTranslation } from '@/hooks/useTranslation';

const FORM_ID = 'finance-ledger-form';
const SHEET_CONTENT_CLASS =
  'p-0 gap-0 sm:w-[480px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5';

export type LedgerEntryRow = {
  id: string;
  entryType: 'INCOME' | 'EXPENSE';
  category: string;
  description: string | null;
  amountMinor: number;
  currency: string;
  occurredOn: string;
};

export function LedgerFormSheet({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: LedgerEntryRow | null;
}) {
  const { t } = useTranslation();
  const isEdit = !!record;
  const { saveLedgerEntry } = useFinanceMutations();
  const { activeYearId } = useActiveAcademicYear();
  const pending = saveLedgerEntry.isPending;

  const form = useForm<FinanceLedgerEntryFormValues>({
    resolver: zodResolver(financeLedgerEntrySchema),
    defaultValues: {
      academicYearId: '',
      entryType: 'INCOME',
      category: '',
      description: '',
      amountMinor: 0,
      currency: DEFAULT_FEE_CURRENCY,
      occurredOn: formatLocalDateInputValue(),
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(
      record
        ? {
            academicYearId: activeYearId ?? '',
            entryType: record.entryType,
            category: record.category,
            description: record.description ?? '',
            amountMinor: record.amountMinor,
            currency: record.currency,
            occurredOn: record.occurredOn,
          }
        : {
            academicYearId: activeYearId ?? '',
            entryType: 'INCOME',
            category: '',
            description: '',
            amountMinor: 0,
            currency: DEFAULT_FEE_CURRENCY,
            occurredOn: formatLocalDateInputValue(),
          },
    );
  }, [open, record, activeYearId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await saveLedgerEntry.mutateAsync({
        id: record?.id,
        values: { ...values, academicYearId: activeYearId! },
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
          <SheetTitle className="p-3">
            {isEdit ? t('finance.editLedgerEntry') : t('finance.addLedgerEntry')}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form id={FORM_ID} className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
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
                        <FormLabel>{t('finance.entryTypeLabel')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FINANCE_LEDGER_TYPES.map((value) => (
                              <SelectItem key={value} value={value}>
                                {t(`finance.entryType.${value}`)}
                              </SelectItem>
                            ))}
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
                            inputMode="decimal"
                            value={
                              field.value
                                ? (field.value / 100).toString()
                                : ''
                            }
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
                        <FormLabel>{t('finance.occurredOn')}</FormLabel>
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
                        <FormLabel>{t('common.labels.notes')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
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
                {t('common.buttons.save')}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
