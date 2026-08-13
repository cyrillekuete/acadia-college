'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon } from '@/lib/icons';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  financeLedgerEntrySchema,
  type FinanceLedgerEntryFormValues,
} from '@/lib/acadia/finance-schemas';
import {
  financeLedgerTypeLabel,
  formatMoneyMinor,
  parseMoneyToMinor,
} from '@/lib/acadia/finance';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canWriteFinance } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export function FinanceLedgerPanel() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug);
  const { activeYearId } = useActiveAcademicYear();
  const { createLedgerEntry } = useFinanceMutations();

  const form = useForm<FinanceLedgerEntryFormValues>({
    resolver: zodResolver(financeLedgerEntrySchema),
    defaultValues: {
      academicYearId: '',
      entryType: 'INCOME',
      category: '',
      description: '',
      amountMinor: 0,
      currency: 'XAF',
      occurredOn: formatLocalDateInputValue(),
    },
  });

  const query = useQuery({
    queryKey: ['finance-ledger', tenantId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('FinanceLedgerEntry')
        .select('id, entryType, category, description, amountMinor, currency, occurredOn')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!)
        .order('occurredOn', { ascending: false });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  useEffect(() => {
    if (activeYearId) {
      form.setValue('academicYearId', activeYearId);
    }
  }, [activeYearId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    await createLedgerEntry.mutateAsync({
      ...values,
      academicYearId: activeYearId!,
    });
    form.reset({
      academicYearId: activeYearId!,
      entryType: 'INCOME',
      category: '',
      description: '',
      amountMinor: 0,
      currency: 'XAF',
      occurredOn: formatLocalDateInputValue(),
    });
  });

  return (
    <div className="space-y-6">
      <CurrentAcademicYearBadge />

      {canManage && activeYearId ? (
        <Form {...form}>
          <form
            onSubmit={onSubmit}
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-3"
          >
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
                    <Input {...field} placeholder={t('finance.categoryPlaceholder')} />
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
                      onChange={(e) =>
                        field.onChange(parseMoneyToMinor(e.target.value))
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
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>{t('common.labels.description')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-end">
              <Button type="submit" disabled={createLedgerEntry.isPending}>
                {createLedgerEntry.isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                {t('finance.addEntry')}
              </Button>
            </div>
          </form>
        </Form>
      ) : null}

      {query.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(query.error)}
        </p>
      ) : null}

      {activeYearId && query.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.labels.date')}</TableHead>
              <TableHead>{t('common.labels.type')}</TableHead>
              <TableHead>{t('finance.category')}</TableHead>
              <TableHead>{t('common.labels.description')}</TableHead>
              <TableHead className="text-right">{t('finance.amount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map((row) => (
              <TableRow key={row.id as string}>
                <TableCell>{String(row.occurredOn)}</TableCell>
                <TableCell>
                  <Badge
                    variant={row.entryType === 'INCOME' ? 'success' : 'destructive'}
                    appearance="light"
                  >
                    {t(`finance.entryType.${String(row.entryType)}`, {
                      defaultValue: financeLedgerTypeLabel(String(row.entryType)),
                    })}
                  </Badge>
                </TableCell>
                <TableCell>{String(row.category)}</TableCell>
                <TableCell>{String(row.description ?? '—')}</TableCell>
                <TableCell className="text-right">
                  {formatMoneyMinor(
                    Number(row.amountMinor),
                    String(row.currency ?? 'XAF'),
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
