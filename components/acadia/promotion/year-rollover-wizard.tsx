'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { AlertTriangle, LoaderCircleIcon } from '@/lib/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { yearRolloverSchema, type YearRolloverValues } from '@/lib/acadia/promotion-schemas';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { usePromotionMutations } from '@/hooks/use-promotion-mutations';
import { fetchClassesMissingPolicies } from '@/lib/supabase/queries/promotion';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canManagePromotion } from '@/lib/acadia/roles';

export function YearRolloverWizard({ sourceYearId }: { sourceYearId: string }) {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManagePromotion(session?.roleSlug);
  const { data: years = [] } = useAcademicYearOptions();
  const { executeYearRollover } = usePromotionMutations();

  const form = useForm<YearRolloverValues>({
    resolver: zodResolver(yearRolloverSchema),
    defaultValues: {
      sourceAcademicYearId: sourceYearId,
      targetAcademicYearId: '',
      createTargetYear: false,
      targetYearLabel: '',
      targetYearStartsOn: '',
      targetYearEndsOn: '',
      promoteEligible: true,
      repeatNonEligible: true,
    },
  });

  const createTargetYear = form.watch('createTargetYear');
  const sourceLabel = years.find((y) => y.id === sourceYearId)?.label ?? sourceYearId;

  useEffect(() => {
    form.setValue('sourceAcademicYearId', sourceYearId);
  }, [sourceYearId, form]);

  const missingPoliciesQuery = useQuery({
    queryKey: ['promotion-missing-policies', tenantId, sourceYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchClassesMissingPolicies(supabase, tenantId!, sourceYearId);
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      sessionError,
      session,
      tenantId,
    ),
  });

  const previewQuery = useQuery({
    queryKey: ['promotion-rollover-preview', tenantId, sourceYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StudentPromotionDecision')
        .select('finalAction')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', sourceYearId);
      if (error) {
        throw error;
      }
      const counts = { PROMOTE: 0, REPEAT: 0, GRADUATE: 0, DEFER: 0, WITHDRAW: 0 };
      for (const row of data ?? []) {
        const action = row.finalAction as keyof typeof counts;
        if (action in counts) {
          counts[action] += 1;
        }
      }
      return { total: data?.length ?? 0, ...counts };
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      sessionError,
      session,
      tenantId,
    ),
  });

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Administrator access is required to run year rollover.
      </p>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    executeYearRollover.mutate(values);
  });

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-muted-foreground">
        End-of-year rollover (FR-DM-3) creates enrollments in the target year from
        saved promotion decisions, provisions the Cameroon calendar if needed, and sets
        the target year as current. Students with DEFER or WITHDRAW decisions are
        skipped (no new enrollment); handle them manually after rollover.
      </p>

      <Alert>
        <AlertTriangle className="size-4" />
        <AlertTitle>Source year: {sourceLabel}</AlertTitle>
        <AlertDescription>
          Run automatic promotion from{' '}
          <Link href="/academics/promotion" className="text-primary underline">
            Promotion management
          </Link>{' '}
          before rollover. This action cannot be undone.
        </AlertDescription>
      </Alert>

      {(missingPoliciesQuery.data?.length ?? 0) > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Missing promotion policies</AlertTitle>
          <AlertDescription>
            Classes with enrolled students but no policy:{' '}
            {missingPoliciesQuery.data!
              .map((c) => `${c.className} (${c.enrollmentCount})`)
              .join(', ')}
            . Configure policies before rollover.
          </AlertDescription>
        </Alert>
      ) : null}

      {previewQuery.data && previewQuery.data.total === 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>No promotion decisions</AlertTitle>
          <AlertDescription>
            Compute promotion for all classes in the source year before running rollover.
          </AlertDescription>
        </Alert>
      ) : null}

      {previewQuery.data && previewQuery.data.total > 0 ? (
        <div className="space-y-1 rounded-lg border p-4 text-sm">
          <p className="font-medium">{previewQuery.data.total} promotion decision(s)</p>
          <p className="text-muted-foreground">
            {previewQuery.data.PROMOTE} promote · {previewQuery.data.REPEAT} repeat ·{' '}
            {previewQuery.data.GRADUATE} graduate · {previewQuery.data.DEFER} defer ·{' '}
            {previewQuery.data.WITHDRAW} withdraw
          </p>
        </div>
      ) : null}

      {previewQuery.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(previewQuery.error)}
        </p>
      ) : null}

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="createTargetYear"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Create a new academic year</FormLabel>
              </FormItem>
            )}
          />

          {createTargetYear ? (
            <>
              <FormField
                control={form.control}
                name="targetYearLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New year label</FormLabel>
                    <FormControl>
                      <Input placeholder="2026-2027" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="targetYearStartsOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starts</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetYearEndsOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ends</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          ) : (
            <FormField
              control={form.control}
              name="targetAcademicYearId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target academic year</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {years
                        .filter((y) => y.id !== sourceYearId)
                        .map((y) => (
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
          )}

          <FormField
            control={form.control}
            name="promoteEligible"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Enroll promoted students</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="repeatNonEligible"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Enroll repeating students</FormLabel>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={
              executeYearRollover.isPending ||
              (previewQuery.data?.total ?? 0) === 0 ||
              (missingPoliciesQuery.data?.length ?? 0) > 0
            }
          >
            {executeYearRollover.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Execute rollover
          </Button>
        </form>
      </Form>
    </div>
  );
}

