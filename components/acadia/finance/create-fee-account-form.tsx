'use client';

import { useEffect } from 'react';
import Link from 'next/link';
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
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  branchLabel,
  subSystemLabel,
} from '@/lib/acadia/education-system';
import {
  createStudentFeeAccountSchema,
  type CreateStudentFeeAccountValues,
} from '@/lib/acadia/finance-schemas';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';

export const CREATE_FEE_ACCOUNT_FORM_ID = 'create-fee-account-form';

export function CreateFeeAccountForm({
  onCancelHref = '/finance/fees',
  onCancel,
  hideActions = false,
  formId = CREATE_FEE_ACCOUNT_FORM_ID,
  onPendingChange,
}: {
  onCancelHref?: string;
  onCancel?: () => void;
  hideActions?: boolean;
  formId?: string;
  onPendingChange?: (pending: boolean) => void;
}) {
  const { createStudentFeeAccount } = useFinanceMutations();
  const { activeYearId } = useActiveAcademicYear();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const form = useForm<CreateStudentFeeAccountValues>({
    resolver: zodResolver(createStudentFeeAccountSchema),
    defaultValues: {
      studentProfileId: '',
      academicYearId: '',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      studentEnrollmentId: '',
      classId: '',
      feeCurrency: 'XAF',
      useStreamPlan: true,
    },
  });

  const academicYearId = form.watch('academicYearId');

  const studentsQuery = useQuery({
    queryKey: ['fee-account-students', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StudentEnrollment')
        .select(
          `
          id,
          studentProfileId,
          subSystem,
          branch,
          classId,
          StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', academicYearId)
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
          enrollmentId: row.id as string,
          studentProfileId: row.studentProfileId as string,
          classId: (row.classId as string | null) ?? '',
          subSystem: row.subSystem as CreateStudentFeeAccountValues['subSystem'],
          branch: row.branch as CreateStudentFeeAccountValues['branch'],
          label: `${profile?.registrationNumber ?? '—'} — ${user?.name ?? 'Student'}`,
        };
      });
    },
    enabled:
      !!academicYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  useEffect(() => {
    if (activeYearId) {
      form.setValue('academicYearId', activeYearId);
    }
  }, [activeYearId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    await createStudentFeeAccount.mutateAsync({
      ...values,
      academicYearId: activeYearId!,
    });
  });

  const pending = createStudentFeeAccount.isPending;

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={onSubmit}
        className={hideActions ? 'space-y-4' : 'space-y-4 max-w-lg'}
      >
        <FormField
          control={form.control}
          name="academicYearId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Academic year</FormLabel>
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
              <FormLabel>Student (enrolled)</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  const row = studentsQuery.data?.find(
                    (s) => s.studentProfileId === value,
                  );
                  if (row) {
                    form.setValue('studentEnrollmentId', row.enrollmentId);
                    form.setValue('classId', row.classId);
                    form.setValue('subSystem', row.subSystem);
                    form.setValue('branch', row.branch);
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(studentsQuery.data ?? []).map((s) => (
                    <SelectItem key={s.studentProfileId} value={s.studentProfileId}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {studentsQuery.isError ? (
                <p className="text-sm text-destructive">
                  {getQueryErrorMessage(studentsQuery.error)}
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

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

        {hideActions ? null : (
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || !activeYearId}>
              {pending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Create fee account
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="outline" asChild>
                <Link href={onCancelHref}>Cancel</Link>
              </Button>
            )}
          </div>
        )}
      </form>
    </Form>
  );
}
