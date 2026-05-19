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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createStudentFeeAccountSchema,
  type CreateStudentFeeAccountValues,
} from '@/lib/acadia/finance-schemas';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import { useSpecialtyOptions } from '@/hooks/use-enrollment-catalog-options';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';

export function CreateFeeAccountForm() {
  const { createStudentFeeAccount } = useFinanceMutations();
  const { data: years = [] } = useAcademicYearOptions();
  const { data: specialties = [] } = useSpecialtyOptions();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const form = useForm<CreateStudentFeeAccountValues>({
    resolver: zodResolver(createStudentFeeAccountSchema),
    defaultValues: {
      studentProfileId: '',
      academicYearId: '',
      specialtyId: '',
      studentEnrollmentId: '',
      feeCurrency: 'XAF',
      useSpecialtyPlan: true,
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
          specialtyId,
          StudentProfile:studentProfileId (
            registrationNumber,
            User:userId ( name )
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
          specialtyId: row.specialtyId as string,
          label: `${profile?.registrationNumber ?? '—'} — ${user?.name ?? 'Student'}`,
        };
      });
    },
    enabled:
      !!academicYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  useEffect(() => {
    if (years.length === 0) {
      return;
    }
    const current = years.find((y) => y.isCurrent);
    if (current) {
      form.setValue('academicYearId', current.id);
    }
  }, [years, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    await createStudentFeeAccount.mutateAsync(values);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
        <FormField
          control={form.control}
          name="academicYearId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Academic year</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
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
                    form.setValue('specialtyId', row.specialtyId);
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

        <FormField
          control={form.control}
          name="specialtyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialty</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {specialties.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} — {s.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={createStudentFeeAccount.isPending}>
            {createStudentFeeAccount.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Create fee account
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/finance/fees">Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
