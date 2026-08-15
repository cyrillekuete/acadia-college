'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
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
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
import {
  computeSaleTotalMinor,
  FINANCE_SALE_ITEM_TYPES,
  FINANCE_SALE_STATUSES,
  formatMoneyMinor,
  parseMoneyToMinor,
  SALE_ITEM_DEFAULT_NAMES,
  type FinanceSaleItemType,
  type FinanceSaleRow,
} from '@/lib/acadia/finance';
import {
  financeSaleSchema,
  type FinanceSaleFormValues,
} from '@/lib/acadia/finance-schemas';
import { useTranslation } from '@/hooks/useTranslation';

const SALE_FORM_ID = 'finance-sale-form';

const SHEET_CONTENT_CLASS =
  'p-0 gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5';

export function SalesFormSheet({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: FinanceSaleRow | null;
}) {
  const { t } = useTranslation();
  const isEdit = !!record;
  const { createSale, updateSale } = useFinanceMutations();
  const { activeYearId } = useActiveAcademicYear();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const pending = createSale.isPending || updateSale.isPending;
  const [itemNameTouched, setItemNameTouched] = useState(false);

  const form = useForm<FinanceSaleFormValues>({
    resolver: zodResolver(financeSaleSchema),
    defaultValues: {
      academicYearId: '',
      studentProfileId: '',
      itemType: 'UNIFORM',
      itemName: SALE_ITEM_DEFAULT_NAMES.UNIFORM,
      quantity: 1,
      unitPriceMinor: 0,
      saleDate: formatLocalDateInputValue(),
      status: 'COMPLETED',
      notes: '',
    },
  });

  const studentsQuery = useQuery({
    queryKey: ['sale-students', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StudentEnrollment')
        .select(
          `
          studentProfileId,
          StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!)
        .eq('status', 'ENROLLED');
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => {
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(row.StudentProfile);
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        return {
          studentProfileId: row.studentProfileId as string,
          label: `${profile?.registrationNumber ?? '—'} — ${user?.name ?? 'Student'}`,
        };
      });
    },
    enabled:
      open &&
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  useEffect(() => {
    if (!open) {
      setItemNameTouched(false);
      return;
    }
    if (record) {
      form.reset({
        academicYearId: activeYearId ?? '',
        studentProfileId: record.studentProfileId,
        itemType: record.itemType,
        itemName: record.itemName,
        quantity: record.quantity,
        unitPriceMinor: record.unitPriceMinor,
        saleDate: record.saleDate,
        status: record.status,
        notes: record.notes ?? '',
      });
      setItemNameTouched(true);
      return;
    }
    form.reset({
      academicYearId: activeYearId ?? '',
      studentProfileId: '',
      itemType: 'UNIFORM',
      itemName: SALE_ITEM_DEFAULT_NAMES.UNIFORM,
      quantity: 1,
      unitPriceMinor: 0,
      saleDate: formatLocalDateInputValue(),
      status: 'COMPLETED',
      notes: '',
    });
    setItemNameTouched(false);
  }, [open, record, activeYearId, form]);

  const quantity = form.watch('quantity');
  const unitPriceMinor = form.watch('unitPriceMinor');
  const previewTotal = computeSaleTotalMinor(quantity, unitPriceMinor);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      academicYearId: activeYearId!,
    };
    try {
      if (isEdit && record) {
        await updateSale.mutateAsync({ id: record.id, values: payload });
      } else {
        await createSale.mutateAsync(payload);
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
            {isEdit ? t('finance.editSale') : t('finance.addSale')}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form id={SALE_FORM_ID} className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
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
                    name="studentProfileId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.selectStudent')}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isEdit}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('finance.selectStudent')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(studentsQuery.data ?? []).map((student) => (
                              <SelectItem
                                key={student.studentProfileId}
                                value={student.studentProfileId}
                              >
                                {student.label}
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
                    name="itemType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.itemType')}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            const itemType = value as FinanceSaleItemType;
                            field.onChange(itemType);
                            if (!itemNameTouched) {
                              form.setValue(
                                'itemName',
                                SALE_ITEM_DEFAULT_NAMES[itemType],
                              );
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FINANCE_SALE_ITEM_TYPES.map((value) => (
                              <SelectItem key={value} value={value}>
                                {t(`finance.saleItemType.${value}`)}
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
                    name="itemName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.itemName')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(event) => {
                              setItemNameTouched(true);
                              field.onChange(event);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('finance.quantity')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              value={field.value || ''}
                              onChange={(event) =>
                                field.onChange(Number.parseInt(event.target.value, 10) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unitPriceMinor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('finance.unitPrice')}</FormLabel>
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
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {t('finance.totalAmount')}: {formatMoneyMinor(previewTotal)}
                  </p>

                  <FormField
                    control={form.control}
                    name="saleDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('finance.saleDate')}</FormLabel>
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

                  {isEdit ? (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('common.labels.status')}</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FINANCE_SALE_STATUSES.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {t(`finance.saleStatus.${value}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

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
                {isEdit ? t('common.buttons.save') : t('finance.addSale')}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
