'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { formatMarkScore } from '@/lib/acadia/assessment';
import { promotionActionLabel } from '@/lib/acadia/promotion';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import { useClassesForFilters } from '@/hooks/use-enrollment-catalog-options';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { fetchPromotionStatementRows } from '@/lib/supabase/queries/promotion';
import { requireBrowserClient } from '@/lib/supabase/client';

const statementFiltersSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required.'),
  classId: z.string().min(1, 'Class is required.'),
});

type StatementFiltersValues = z.infer<typeof statementFiltersSchema>;

export function PromotionStatementView() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: years = [] } = useAcademicYearOptions();
  const { data: classes = [] } = useClassesForFilters();

  const form = useForm<StatementFiltersValues>({
    resolver: zodResolver(statementFiltersSchema),
    defaultValues: { academicYearId: '', classId: '' },
  });

  const academicYearId = form.watch('academicYearId');
  const [submitted, setSubmitted] = useState<StatementFiltersValues | null>(null);

  useEffect(() => {
    if (years.length > 0 && !academicYearId) {
      const current = years.find((y) => y.isCurrent);
      form.setValue('academicYearId', current?.id ?? years[0].id);
    }
  }, [years, academicYearId, form]);

  const reportQuery = useQuery({
    queryKey: ['promotion-statement', tenantId, submitted],
    queryFn: async () => {
      if (!submitted) {
        return [];
      }
      const supabase = requireBrowserClient();
      return fetchPromotionStatementRows(supabase, tenantId!, {
        academicYearId: submitted.academicYearId,
        classId: submitted.classId,
      });
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!submitted,
  });

  const rows = useMemo(() => reportQuery.data ?? [], [reportQuery.data]);
  const className = classes.find((c) => c.id === submitted?.classId)?.name;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Promotion statements reflect stored decisions from Promotion management,
        including class-specific thresholds and manual overrides.
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => setSubmitted(values))}
          className="flex flex-wrap items-end gap-4"
        >
          <FormField
            control={form.control}
            name="academicYearId"
            render={({ field }) => (
              <FormItem className="min-w-[160px]">
                <FormLabel>Academic year</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.label}
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
            name="classId"
            render={({ field }) => (
              <FormItem className="min-w-[200px]">
                <FormLabel>Class</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="secondary">
            Generate statement
          </Button>
        </form>
      </Form>

      {reportQuery.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(reportQuery.error)}
        </p>
      ) : null}

      {submitted && !reportQuery.isLoading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No promotion decisions for {className ?? 'this class'}.{' '}
          <Link href="/academics/promotion" className="text-primary hover:underline">
            Compute promotion
          </Link>{' '}
          first.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            {className} — {rows.length} student(s)
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Year avg</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Recommended</TableHead>
                <TableHead>Final decision</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const profile = unwrapRelation<{
                  registrationNumber?: string;
                  User?: unknown;
                }>(row.StudentProfile);
                const user = unwrapRelation<{ name?: string }>(profile?.User);
                const rowKey =
                  (row.id as string | null) ??
                  `pending-${row.studentProfileId as string}`;
                return (
                  <TableRow key={rowKey}>
                    <TableCell>
                      {user?.name ?? profile?.registrationNumber ?? '—'}
                    </TableCell>
                    <TableCell>
                      {row.isPending
                        ? '—'
                        : formatMarkScore(
                            row.yearAverage != null
                              ? Number(row.yearAverage)
                              : null,
                          )}
                    </TableCell>
                    <TableCell>
                      {row.policyMinAverage != null
                        ? formatMarkScore(Number(row.policyMinAverage))
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {row.isPending
                        ? 'Pending'
                        : promotionActionLabel(
                            row.recommendedAction as Parameters<
                              typeof promotionActionLabel
                            >[0],
                          )}
                    </TableCell>
                    <TableCell>
                      {row.isPending
                        ? 'Pending'
                        : promotionActionLabel(
                            row.finalAction as Parameters<
                              typeof promotionActionLabel
                            >[0],
                          )}
                    </TableCell>
                    <TableCell>
                      {row.isPending
                        ? '—'
                        : row.source === 'MANUAL'
                          ? 'Manual'
                          : 'Auto'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {row.notes ?? '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
