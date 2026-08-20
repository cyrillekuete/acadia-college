'use client';

import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { totalsFromFeeAccountRecord } from '@/lib/acadia/finance';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { shouldWarnFeeHold } from '@/lib/acadia/transcripts';
import {
  transcriptCopyRequestCreateSchema,
  transcriptCopyRequestReviewSchema,
  type TranscriptCopyRequestCreateValues,
  type TranscriptCopyRequestReviewValues,
} from '@/lib/acadia/transcripts-schemas';
import { useTranscriptMutations } from '@/hooks/use-transcript-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useTranslation } from '@/hooks/useTranslation';

type StudentOption = {
  id: string;
  label: string;
};

export function TranscriptCopyRequestCreateForm({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const { t } = useTranslation();
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { submitCopyRequest } = useTranscriptMutations();

  const studentsQuery = useQuery({
    queryKey: ['transcript-copy-students', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StudentProfile')
        .select(
          `
          id,
          registrationNumber,
          matriculeNumber,
          User!StudentProfile_userId_tenantId_fkey ( name )
        `,
        )
        .eq('tenantId', tenantId!)
        .order('registrationNumber')
        .limit(500);
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => {
        const user = unwrapRelation<{ name?: string }>(row.User);
        const name = user?.name?.trim() || row.registrationNumber || row.id;
        const matricule = row.matriculeNumber?.trim();
        return {
          id: row.id as string,
          label: matricule ? `${name} · ${matricule}` : String(name),
        } satisfies StudentOption;
      });
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  const form = useForm<TranscriptCopyRequestCreateValues>({
    resolver: zodResolver(transcriptCopyRequestCreateSchema),
    defaultValues: { studentProfileId: '', note: '' },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          submitCopyRequest.mutate(values, {
            onSuccess: () => {
              form.reset();
              onCreated?.();
            },
          }),
        )}
        className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
      >
        <FormField
          control={form.control}
          name="studentProfileId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('transcripts.student')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('transcripts.selectStudent')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(studentsQuery.data ?? []).map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.label}
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
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('transcripts.noteOptional')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="md:col-span-2" disabled={submitCopyRequest.isPending}>
          {t('transcripts.newRequest')}
        </Button>
      </form>
    </Form>
  );
}

export function TranscriptCopyRequestReviewForm({
  requestId,
  studentProfileId,
  currentStatus,
  onClose,
}: {
  requestId: string;
  studentProfileId: string;
  currentStatus: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { reviewCopyRequest } = useTranscriptMutations();

  const form = useForm<TranscriptCopyRequestReviewValues>({
    resolver: zodResolver(transcriptCopyRequestReviewSchema),
    defaultValues: { status: 'FULFILLED', note: '' },
  });

  const feeQuery = useQuery({
    queryKey: ['transcript-copy-fee-hold', tenantId, studentProfileId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StudentFeeAccount')
        .select(
          `
          totalAmountMinor,
          creditMinor,
          withdrawnAt,
          StudentFeeInstallment ( amountMinor, status, paidAmountMinor ),
          StudentScholarship ( discountMinor )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('studentProfileId', studentProfileId);
      if (error) {
        throw error;
      }
      return (data ?? [])
        .filter((row) => !row.withdrawnAt)
        .reduce(
          (sum, row) => sum + totalsFromFeeAccountRecord(row).balanceMinor,
          0,
        );
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  const feeHold = shouldWarnFeeHold(feeQuery.data ?? 0);

  const statusOptions = useMemo(
    () =>
      [
        { value: 'FULFILLED' as const, label: t('transcripts.requestFulfilled') },
        { value: 'REJECTED' as const, label: t('transcripts.requestRejected') },
      ],
    [t],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          if (values.status === 'FULFILLED' && feeHold) {
            const confirmed = window.confirm(t('transcripts.feeHoldConfirm'));
            if (!confirmed) {
              return;
            }
          }
          reviewCopyRequest.mutate(
            {
              requestId,
              studentProfileId,
              currentStatus,
              values,
            },
            { onSuccess: onClose },
          );
        })}
        className="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-2"
      >
        {feeHold ? (
          <p className="text-sm text-amber-800 dark:text-amber-200 md:col-span-2">
            {t('transcripts.feeHoldWarning')}
          </p>
        ) : null}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('transcripts.decision')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('transcripts.note')}</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={reviewCopyRequest.isPending}>
            {t('transcripts.saveReview')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.buttons.cancel')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
