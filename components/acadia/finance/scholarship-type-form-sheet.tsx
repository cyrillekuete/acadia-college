'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
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
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import { parseMoneyToMinor } from '@/lib/acadia/finance';
import {
  scholarshipTypeSchema,
  type ScholarshipTypeFormValues,
} from '@/lib/acadia/finance-schemas';
import { useTranslation } from '@/hooks/useTranslation';

const FORM_ID = 'scholarship-type-form';
const SHEET_CONTENT_CLASS =
  'p-0 gap-0 sm:w-[480px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5';

export type ScholarshipTypeRow = {
  id: string;
  nameEn: string;
  nameFr: string;
  discountKind: 'PERCENT_BPS' | 'FIXED_MINOR';
  percentBps: number | null;
  fixedAmountMinor: number | null;
  isActive: boolean;
};

export function ScholarshipTypeFormSheet({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: ScholarshipTypeRow | null;
}) {
  const { t } = useTranslation();
  const isEdit = !!record;
  const { saveScholarshipType } = useFinanceMutations();
  const pending = saveScholarshipType.isPending;

  const form = useForm<ScholarshipTypeFormValues>({
    resolver: zodResolver(scholarshipTypeSchema),
    defaultValues: {
      nameEn: '',
      nameFr: '',
      discountKind: 'PERCENT_BPS',
      percentBps: 1000,
      fixedAmountMinor: null,
      isActive: true,
    },
  });

  const discountKind = form.watch('discountKind');

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(
      record
        ? {
            id: record.id,
            nameEn: record.nameEn,
            nameFr: record.nameFr,
            discountKind: record.discountKind,
            percentBps: record.percentBps,
            fixedAmountMinor: record.fixedAmountMinor,
            isActive: record.isActive,
          }
        : {
            nameEn: '',
            nameFr: '',
            discountKind: 'PERCENT_BPS',
            percentBps: 1000,
            fixedAmountMinor: null,
            isActive: true,
          },
    );
  }, [open, record, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await saveScholarshipType.mutateAsync(values);
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
            {isEdit
              ? t('finance.editScholarshipType')
              : t('finance.addScholarshipType')}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form id={FORM_ID} className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
            <SheetBody className="p-0">
              <ScrollArea className="h-[calc(100vh-10.5rem)]">
                <div className="space-y-4 px-5 py-2.5">
                  <FormField
                    control={form.control}
                    name="nameEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.labels.nameEn')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nameFr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.labels.nameFr')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discountKind"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.discountKind')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PERCENT_BPS">
                              {t('finance.percent')}
                            </SelectItem>
                            <SelectItem value="FIXED_MINOR">
                              {t('finance.fixedAmount')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {discountKind === 'PERCENT_BPS' ? (
                    <FormField
                      control={form.control}
                      name="percentBps"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('finance.percent')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0.01}
                              max={100}
                              step={0.01}
                              value={
                                field.value != null ? Number(field.value) / 100 : ''
                              }
                              onChange={(event) => {
                                const pct = Number(event.target.value);
                                field.onChange(
                                  Number.isFinite(pct)
                                    ? Math.round(pct * 100)
                                    : null,
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="fixedAmountMinor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('finance.fixedAmount')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              value={field.value ? field.value / 100 : ''}
                              onChange={(event) =>
                                field.onChange(
                                  parseMoneyToMinor(event.target.value) || null,
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border p-3">
                        <FormLabel>{t('common.labels.active')}</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
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
              <Button type="submit" disabled={pending}>
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
