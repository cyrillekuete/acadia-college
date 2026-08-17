'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { LoaderCircleIcon, Plus, Trash2 } from '@/lib/icons';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { FeePlanClassMultiSelect } from '@/components/acadia/finance/fee-plan-class-multi-select';
import {
  streamFeePlanSchema,
  type StreamFeePlanFormValues,
} from '@/lib/acadia/finance-schemas';
import {
  applyDefaultFeeInstallmentSplit,
  defaultFeeInstallmentTemplates,
  formatMoneyMinor,
  parseMoneyToMinor,
  splitTuitionIntoDefaultInstallments,
  sumInstallmentTemplates,
  type FeePlanRow,
} from '@/lib/acadia/finance';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { EMPTY_CATALOG_FILTERS, type CatalogFilters } from '@/lib/acadia/education-system';
import { useTranslation } from '@/hooks/useTranslation';

export const FEE_PLAN_FORM_ID = 'fee-plan-setup-form';

function valuesFromRecord(
  record: FeePlanRow | null | undefined,
  academicYearId: string,
): StreamFeePlanFormValues {
  const installments = record?.installments.length
    ? record.installments
    : defaultFeeInstallmentTemplates();
  return {
    id: record?.id,
    academicYearId,
    classIds: record?.classes.map((row) => row.id) ?? [],
    totalAmountMinor: record?.installments.length
      ? sumInstallmentTemplates(record.installments)
      : 0,
    installments,
  };
}

export function FeePlanSetupForm({
  record,
  hideActions = false,
  formId = FEE_PLAN_FORM_ID,
  onCancel,
  onPendingChange,
  onSaved,
}: {
  record?: FeePlanRow | null;
  hideActions?: boolean;
  formId?: string;
  onCancel?: () => void;
  onPendingChange?: (pending: boolean) => void;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const { saveStreamFeePlan } = useFinanceMutations();
  const { activeYearId } = useActiveAcademicYear();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const [catalogFilters, setCatalogFilters] =
    useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);

  const form = useForm<StreamFeePlanFormValues>({
    resolver: zodResolver(streamFeePlanSchema),
    defaultValues: valuesFromRecord(record, activeYearId ?? ''),
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'installments',
  });

  useEffect(() => {
    const next = valuesFromRecord(record, activeYearId ?? '');
    form.reset(next);
    replace(next.installments);
    setCatalogFilters(EMPTY_CATALOG_FILTERS);
  }, [record, activeYearId, form, replace]);

  const assignmentsQuery = useQuery({
    queryKey: ['fee-plan-class-assignments', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StreamFeePlanClass')
        .select('classId, streamFeePlanId')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!);
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const assignedElsewhere = new Set(
    (assignmentsQuery.data ?? [])
      .filter((row) => row.streamFeePlanId !== record?.id)
      .map((row) => row.classId),
  );

  const installments = form.watch('installments');
  const fullAmountMinor = Number(form.watch('totalAmountMinor')) || 0;
  const installmentSumMinor = sumInstallmentTemplates(
    installments.map((row) => ({
      ...row,
      amountMinor: Number(row.amountMinor) || 0,
    })),
  );
  const differenceMinor = fullAmountMinor - installmentSumMinor;
  const installmentArrayError =
    form.formState.errors.installments?.message ??
    form.formState.errors.installments?.root?.message;

  const pending = saveStreamFeePlan.isPending;

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!activeYearId) {
      return;
    }
    await saveStreamFeePlan.mutateAsync({
      ...values,
      id: record?.id,
      academicYearId: activeYearId,
    });
    onSaved?.();
  });

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={onSubmit}
        className={hideActions ? 'space-y-6' : 'space-y-6 max-w-3xl'}
      >
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
          name="classIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('finance.selectClasses')}</FormLabel>
              <FeePlanClassMultiSelect
                value={field.value}
                onChange={field.onChange}
                assignedElsewhere={assignedElsewhere}
                filters={catalogFilters}
                onFiltersChange={setCatalogFilters}
              />
              {assignmentsQuery.isError ? (
                <p className="text-sm text-destructive">
                  {getQueryErrorMessage(assignmentsQuery.error)}
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="totalAmountMinor"
          render={({ field: f }) => (
            <FormItem>
              <FormLabel>{t('finance.fullAmount')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={f.value ? f.value / 100 : ''}
                  onChange={(e) => {
                    const nextTotal = parseMoneyToMinor(e.target.value);
                    f.onChange(nextTotal);
                    if (nextTotal <= 0) {
                      return;
                    }
                    replace(
                      applyDefaultFeeInstallmentSplit(
                        form.getValues('installments'),
                        splitTuitionIntoDefaultInstallments(nextTotal),
                      ),
                    );
                    form.clearErrors(['totalAmountMinor', 'installments']);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{t('finance.installments')}</h3>
            {differenceMinor !== 0 && fullAmountMinor > 0 ? (
              <p
                className={
                  differenceMinor < 0
                    ? 'text-sm text-destructive'
                    : 'text-sm text-muted-foreground'
                }
              >
                {t(
                  differenceMinor < 0
                    ? 'finance.installmentSumOverage'
                    : 'finance.installmentSumRemaining',
                  { amount: formatMoneyMinor(Math.abs(differenceMinor)) },
                )}
              </p>
            ) : null}
          </div>
          {installmentArrayError ? (
            <p className="text-xs text-destructive">
              {t(String(installmentArrayError), {
                defaultValue: String(installmentArrayError),
              })}
            </p>
          ) : null}

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
            >
              <FormField
                control={form.control}
                name={`installments.${index}.labelEn`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>{t('finance.labelEn')}</FormLabel>
                    <FormControl>
                      <Input {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`installments.${index}.labelFr`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>{t('finance.labelFr')}</FormLabel>
                    <FormControl>
                      <Input {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`installments.${index}.amountMinor`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>{t('finance.amount')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={f.value ? f.value / 100 : ''}
                        onChange={(e) =>
                          f.onChange(parseMoneyToMinor(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`installments.${index}.dueOn`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>{t('finance.due')}</FormLabel>
                    <FormControl>
                      <DatePickerInput
                        value={f.value ?? ''}
                        onChange={f.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={fields.length <= 1}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" />
                  {t('common.buttons.remove')}
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                installmentNumber: fields.length + 1,
                labelEn: 'Installment',
                labelFr: 'Échéance',
                amountMinor: 0,
                dueOn: '',
              })
            }
          >
            <Plus className="size-4" />
            {t('finance.addInstallment')}
          </Button>
        </div>

        {hideActions ? null : (
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || !activeYearId}>
              {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
              {t('finance.saveFeePlan')}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('common.buttons.cancel')}
              </Button>
            ) : null}
          </div>
        )}
      </form>
    </Form>
  );
}
