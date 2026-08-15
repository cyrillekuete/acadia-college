'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon, Trash2 } from '@/lib/icons';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import {
  subjectAssignmentSchema,
  type SubjectAssignmentFormValues,
} from '@/lib/acadia/subject-schemas';
import { formatRecordValue, unwrapRelation } from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  staffDisplayLabel,
  useStaffOptions,
} from '@/hooks/use-subject-catalog-options';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';
import { Skeleton } from '@/components/ui/skeleton';

export function SubjectAssignmentPanel({
  subjectId,
  canManage = true,
}: {
  subjectId: string;
  canManage?: boolean;
}) {
  const { createAssignment, deleteAssignment } = useSubjectMutations();
  const { data: session, isLoading: sessionLoading, isError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const { data: staff = [] } = useStaffOptions();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['subject-assignments', tenantId, subjectId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('SubjectAssignment')
        .select(
          `
          id,
          isLead,
          teachesPrimaryHome,
          notes,
          StaffProfile!SubjectAssignment_staffProfileId_tenantId_fkey ( staffCode, User!StaffProfile_userId_tenantId_fkey ( name ) ),
          AcademicYear!SubjectAssignment_academicYearId_tenantId_fkey ( label )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('subjectId', subjectId);
      if (activeYearId) {
        query = query.eq('academicYearId', activeYearId);
      }
      const { data, error } = await query.order('createdAt', { ascending: false });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      isError,
      session,
      tenantId,
    ),
  });

  const form = useForm<SubjectAssignmentFormValues>({
    resolver: zodResolver(subjectAssignmentSchema),
    defaultValues: {
      academicYearId: '',
      staffProfileId: '',
      isLead: false,
      teachesPrimaryHome: true,
      notes: '',
    },
  });

  useEffect(() => {
    if (activeYearId) {
      form.setValue('academicYearId', activeYearId);
    }
  }, [activeYearId, form]);

  const onSubmit = (values: SubjectAssignmentFormValues) => {
    createAssignment.mutate(
      { subjectId, values },
      {
        onSuccess: () => {
          form.reset({
            academicYearId: activeYearId ?? values.academicYearId,
            staffProfileId: '',
            isLead: false,
            teachesPrimaryHome: true,
            notes: '',
          });
        },
      },
    );
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <RecordDetailCard
        title="Assigned teachers"
        fields={
          assignments.length === 0
            ? [{ label: 'Teachers', value: 'No teachers assigned yet.' }]
            : assignments.map((row, index) => {
                const staffRel = unwrapRelation<{
                  staffCode?: string;
                  User?: unknown;
                }>(row.StaffProfile);
                const user = unwrapRelation<{ name?: string }>(staffRel?.User);
                const year = unwrapRelation<{ label?: string }>(row.AcademicYear);
                const label =
                  user?.name ?? staffRel?.staffCode ?? `Teacher ${index + 1}`;
                return {
                  label: `${label}${row.isLead ? ' (Lead)' : ''}`,
                  value: (
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        {formatRecordValue(year?.label)} ·{' '}
                        {row.teachesPrimaryHome ? 'Primary home' : 'Support'}
                        {row.notes ? ` · ${row.notes}` : ''}
                      </span>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={deleteAssignment.isPending}
                          onClick={() => deleteAssignment.mutate(row.id as string)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  ),
                };
              })
        }
      />

      {canManage ? (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-lg border p-4">
          <p className="text-sm font-medium">Assign a teacher</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              name="staffProfileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {staffDisplayLabel(member)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="isLead"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Lead teacher</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="teachesPrimaryHome"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Primary home class</FormLabel>
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={createAssignment.isPending}>
            {createAssignment.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Assign teacher
          </Button>
        </form>
      </Form>
      ) : null}
    </div>
  );
}
