'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
  DEFAULT_RETENTION_POLICY,
  previewRetentionArchive,
} from '@/lib/acadia/promotion';
import {
  dataRetentionPolicySchema,
  type DataRetentionPolicyValues,
} from '@/lib/acadia/promotion-schemas';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { usePromotionMutations } from '@/hooks/use-promotion-mutations';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canManagePromotion } from '@/lib/acadia/roles';
import { formatDateTime } from '@/lib/acadia/record-display';

export function DataRetentionSettingsForm() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canManagePromotion(session?.roleSlug);
  const { saveRetentionPolicy, runRetentionArchive } = usePromotionMutations();

  const policyQuery = useQuery({
    queryKey: ['data-retention-policy', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('TenantDataRetentionPolicy')
        .select('*')
        .eq('tenantId', tenantId!)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      sessionError,
      session,
      tenantId,
    ),
  });

  const previewQuery = useQuery({
    queryKey: ['data-retention-preview', tenantId, policyQuery.dataUpdatedAt],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase.rpc('acadia_run_retention_archive', {
        p_dry_run: true,
      });
      if (error) {
        throw error;
      }
      const result = (data ?? {}) as {
        archivedEnrollments?: number;
        deactivated?: number;
      };
      return previewRetentionArchive({
        referenceDate: new Date(),
        archiveInactiveAfterYears:
          policyQuery.data?.archiveInactiveAfterYears ??
          DEFAULT_RETENTION_POLICY.archiveInactiveAfterYears,
        enrollmentRetentionYears:
          policyQuery.data?.enrollmentRetentionYears ??
          DEFAULT_RETENTION_POLICY.enrollmentRetentionYears,
        inactiveProfileCount: Number(result.deactivated ?? 0),
        oldEnrollmentCount: Number(result.archivedEnrollments ?? 0),
      });
    },
    enabled:
      canManage &&
      isAcadiaTenantQueryEnabled(
        sessionLoading,
        sessionError,
        session,
        tenantId,
      ),
  });

  const form = useForm<DataRetentionPolicyValues>({
    resolver: zodResolver(dataRetentionPolicySchema),
    defaultValues: { ...DEFAULT_RETENTION_POLICY },
  });

  useEffect(() => {
    if (policyQuery.data) {
      form.reset({
        marksRetentionYears: policyQuery.data.marksRetentionYears,
        enrollmentRetentionYears: policyQuery.data.enrollmentRetentionYears,
        archiveInactiveAfterYears: policyQuery.data.archiveInactiveAfterYears,
      });
    }
  }, [policyQuery.data, form]);

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Administrator access is required to configure data retention.
      </p>
    );
  }

  if (policyQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {getQueryErrorMessage(policyQuery.error)}
      </p>
    );
  }

  return (
    <div className="max-w-md space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure how long academic and enrollment records are kept before archival
        (FR-DM-4). Marks retention is stored for policy reference and is not purged
        by this job. The archive job only deactivates profiles with no current-year
        enrollment and withdraws enrollments whose academic year ended before the
        cutoff.
      </p>

      {policyQuery.data?.lastArchivalRunAt ? (
        <p className="text-xs text-muted-foreground">
          Last archive run: {formatDateTime(policyQuery.data.lastArchivalRunAt)}
        </p>
      ) : null}

      {previewQuery.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(previewQuery.error)}
        </p>
      ) : null}

      {previewQuery.data ? (
        <p className="text-sm text-muted-foreground">{previewQuery.data.description}</p>
      ) : null}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => saveRetentionPolicy.mutate(values))}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="marksRetentionYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marks retention (years)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={30} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="enrollmentRetentionYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enrollment retention (years)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={30} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="archiveInactiveAfterYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deactivate inactive profiles after (years)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={15} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saveRetentionPolicy.isPending}>
              {saveRetentionPolicy.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Save policy
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={runRetentionArchive.isPending}
              onClick={() => {
                const preview = previewQuery.data;
                const confirmed = window.confirm(
                  preview?.description
                    ? `${preview.description} Continue?`
                    : 'Run the archive job for stale profiles and old enrollments?',
                );
                if (!confirmed) {
                  return;
                }
                runRetentionArchive.mutate({ dryRun: false });
              }}
            >
              {runRetentionArchive.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Run archive job
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
