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
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  DEFAULT_FEE_CURRENCY,
  FEE_BUDGET_CATEGORIES,
  parseMoneyToMinor,
} from '@/lib/acadia/finance';
import {
  financeBudgetLineSchema,
  type FinanceBudgetLineFormValues,
} from '@/lib/acadia/finance-schemas';
import { useTranslation } from '@/hooks/useTranslation';

const FORM_ID = 'finance-budget-form';
const SHEET_CONTENT_CLASS =
  'p-0 gap-0 sm:w-[480px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5';

export type BudgetLineRow = {
  id: string;
  category: FinanceBudgetLineFormValues['category'];
  budgetedMinor: number;
  currency: string;
  notes: string | null;
};

export function BudgetFormSheet({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: BudgetLineRow | null;
}) {
  const { t } = useTranslation();
  const isEdit = !!record;
  const { saveBudgetLine } = useFinanceMutations();
  const { activeYearId } = useActiveAcademicYear();
  const pending = saveBudgetLine.isPending;

  const form = useForm<FinanceBudgetLineFormValues>({
    resolver: zodResolver(financeBudgetLineSchema),
    defaultValues: {
      academicYearId: '',
      category: 'Other',
      budgetedMinor: 0,
      currency: DEFAULT_FEE_CURRENCY,
      notes: '',
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
            category: record.category,
            budgetedMinor: record.budgetedMinor,
            currency: record.currency,
            notes: record.notes ?? '',
          }
        : {
            academicYearId: activeYearId ?? '',
            category: 'Other',
            budgetedMinor: 0,
            currency: DEFAULT_FEE_CURRENCY,
            notes: '',
          },
    );
  }, [open, record, activeYearId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await saveBudgetLine.mutateAsync({
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
            {isEdit ? t('finance.editBudgetLine') : t('finance.addBudgetLine')}
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.category')}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isEdit}
                        >
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
                  <FormField
                    control={form.control}
                    name="budgetedMinor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.budgeted')}</FormLabel>
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
