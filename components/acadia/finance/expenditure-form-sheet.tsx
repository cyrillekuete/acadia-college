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
  canEditExpenditure,
  EXPENDITURE_CATEGORIES,
  FEE_BUDGET_CATEGORIES,
  FINANCE_PAYMENT_METHODS,
  parseMoneyToMinor,
  type ExpenditureRow,
} from '@/lib/acadia/finance';
import {
  expenditureSchema,
  type ExpenditureFormValues,
} from '@/lib/acadia/finance-schemas';
import { useTranslation } from '@/hooks/useTranslation';

const EXPENDITURE_FORM_ID = 'finance-expenditure-form';

const SHEET_CONTENT_CLASS =
  'p-0 gap-0 sm:w-[560px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5';

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}

export function ExpenditureFormSheet({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: ExpenditureRow | null;
}) {
  const { t } = useTranslation();
  const isEdit = !!record;
  const { createExpenditure, updateExpenditure } = useFinanceMutations();
  const { activeYearId } = useActiveAcademicYear();
  const pending = createExpenditure.isPending || updateExpenditure.isPending;

  const form = useForm<ExpenditureFormValues>({
    resolver: zodResolver(expenditureSchema),
    defaultValues: {
      academicYearId: '',
      title: '',
      description: '',
      category: 'other',
      amountMinor: 0,
      currency: 'XAF',
      paymentMethod: 'CASH',
      paymentDate: formatLocalDateInputValue(),
      vendor: '',
      vendorContact: '',
      receiptNumber: '',
      invoiceNumber: '',
      status: 'PENDING',
      budgetCategory: 'Other',
      department: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.reset({
        academicYearId: activeYearId ?? '',
        title: record.title,
        description: record.description ?? '',
        category: record.category,
        amountMinor: record.amountMinor,
        currency: record.currency,
        paymentMethod: record.paymentMethod ?? 'CASH',
        paymentDate: record.paymentDate,
        vendor: record.vendor,
        vendorContact: record.vendorContact ?? '',
        receiptNumber: record.receiptNumber ?? '',
        invoiceNumber: record.invoiceNumber ?? '',
        status: record.status,
        budgetCategory:
          (record.budgetCategory as ExpenditureFormValues['budgetCategory']) ??
          'Other',
        department: record.department ?? '',
        notes: record.notes ?? '',
      });
      return;
    }
    form.reset({
      academicYearId: activeYearId ?? '',
      title: '',
      description: '',
      category: 'other',
      amountMinor: 0,
      currency: 'XAF',
      paymentMethod: 'CASH',
      paymentDate: formatLocalDateInputValue(),
      vendor: '',
      vendorContact: '',
      receiptNumber: '',
      invoiceNumber: '',
      status: 'PENDING',
      budgetCategory: 'Other',
      department: '',
      notes: '',
    });
  }, [open, record, activeYearId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && record && !canEditExpenditure(record.status)) {
      return;
    }
    const payload = {
      ...values,
      academicYearId: activeYearId!,
    };
    try {
      if (isEdit && record) {
        await updateExpenditure.mutateAsync({ id: record.id, values: payload });
      } else {
        await createExpenditure.mutateAsync(payload);
      }
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
            {isEdit ? t('finance.editExpenditure') : t('finance.addExpenditure')}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            id={EXPENDITURE_FORM_ID}
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={onSubmit}
          >
            <SheetBody className="p-0">
              <ScrollArea className="h-[calc(100vh-10.5rem)]">
                <div className="space-y-5 px-5 py-2.5">
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

                  <SectionTitle>{t('finance.basicInformation')}</SectionTitle>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.labels.title')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
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
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EXPENDITURE_CATEGORIES.map((value) => (
                              <SelectItem key={value} value={value}>
                                {t(`finance.expenditureCategory.${value}`)}
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.labels.description')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <SectionTitle>{t('finance.financialInformation')}</SectionTitle>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('finance.paymentMethod')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FINANCE_PAYMENT_METHODS.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {t(`finance.paymentMethodValue.${value}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="paymentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('finance.paymentDate')}</FormLabel>
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
                      name="budgetCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('finance.budgetCategory')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FEE_BUDGET_CATEGORIES.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <SectionTitle>{t('finance.vendorInformation')}</SectionTitle>
                  <FormField
                    control={form.control}
                    name="vendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.vendor')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vendorContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.vendorContact')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="receiptNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('finance.receiptNumber')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('finance.invoiceNumber')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <SectionTitle>{t('finance.additionalInformation')}</SectionTitle>
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.department')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
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
              <Button
                type="submit"
                disabled={
                  pending ||
                  !activeYearId ||
                  (isEdit && !!record && !canEditExpenditure(record.status))
                }
              >
                {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                {isEdit ? t('common.buttons.save') : t('finance.addExpenditure')}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
