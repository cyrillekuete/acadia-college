'use client';

import { useEffect } from 'react';
import Link from 'next/link';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  branchLabel,
  levelDisplayLabel,
  subSystemLabel,
} from '@/lib/acadia/education-system';
import {
  streamFeePlanSchema,
  type StreamFeePlanFormValues,
} from '@/lib/acadia/finance-schemas';
import {
  formatMoneyMinor,
  parseMoneyToMinor,
  sumInstallmentTemplates,
} from '@/lib/acadia/finance';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';

const defaultInstallment = {
  installmentNumber: 1,
  labelEn: 'First installment',
  labelFr: 'Première tranche',
  amountMinor: 0,
  dueOn: '',
};

export function FeePlanSetupForm() {
  const { saveStreamFeePlan } = useFinanceMutations();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const form = useForm<StreamFeePlanFormValues>({
    resolver: zodResolver(streamFeePlanSchema),
    defaultValues: {
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      installments: [{ ...defaultInstallment }],
    },
  });

  const subSystem = form.watch('subSystem');
  const branch = form.watch('branch');
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'installments',
  });

  const planQuery = useQuery({
    queryKey: ['fee-plan', tenantId, subSystem, branch],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StreamFeePlan')
        .select('installments')
        .eq('tenantId', tenantId!)
        .eq('subSystem', subSystem)
        .eq('branch', branch)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data;
    },
    enabled:
      !!subSystem &&
      !!branch &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  useEffect(() => {
    if (!subSystem || !branch || planQuery.isLoading) {
      return;
    }
    const rows = planQuery.data?.installments;
    if (Array.isArray(rows) && rows.length > 0) {
      replace(
        rows.map((row, index) => ({
          installmentNumber: Number(row.installmentNumber ?? index + 1),
          labelEn: String(row.labelEn ?? ''),
          labelFr: String(row.labelFr ?? ''),
          amountMinor: Number(row.amountMinor ?? 0),
          dueOn: String(row.dueOn ?? ''),
        })),
      );
    } else {
      replace([{ ...defaultInstallment, installmentNumber: 1 }]);
    }
  }, [subSystem, branch, planQuery.data, planQuery.isLoading, replace]);

  const installments = form.watch('installments');
  const totalMinor = sumInstallmentTemplates(
    installments.map((row) => ({
      ...row,
      amountMinor: Number(row.amountMinor) || 0,
    })),
  );

  const onSubmit = form.handleSubmit(async (values) => {
    await saveStreamFeePlan.mutateAsync(values);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="subSystem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sub-system</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-system" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACADEMIC_SUB_SYSTEMS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {subSystemLabel(value)}
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
            name="branch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACADEMIC_BRANCHES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {branchLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {planQuery.isError ? (
          <p className="text-sm text-destructive">
            {getQueryErrorMessage(planQuery.error)}
          </p>
        ) : null}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Installments</h3>
            <p className="text-sm text-muted-foreground">
              Total: {formatMoneyMinor(totalMinor)}
            </p>
          </div>

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
                    <FormLabel>Label (EN)</FormLabel>
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
                    <FormLabel>Label (FR)</FormLabel>
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
                    <FormLabel>Amount</FormLabel>
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
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...f} />
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
                  Remove
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
                ...defaultInstallment,
                installmentNumber: fields.length + 1,
              })
            }
          >
            <Plus className="size-4" />
            Add installment
          </Button>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saveStreamFeePlan.isPending}>
            {saveStreamFeePlan.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Save fee plan
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/finance/fees">Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
