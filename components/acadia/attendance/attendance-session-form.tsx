'use client';

import { useEffect } from 'react';
import Link from 'next/link';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  attendanceSessionSchema,
  type AttendanceSessionFormValues,
} from '@/lib/acadia/attendance-schemas';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import { useAttendanceMutations } from '@/hooks/use-attendance-mutations';

export type AttendanceSessionFormRecord = AttendanceSessionFormValues & {
  id: string;
};

export function AttendanceSessionForm({
  record,
  onCancelHref,
}: {
  record?: AttendanceSessionFormRecord | null;
  onCancelHref: string;
}) {
  const isEdit = !!record;
  const { createAttendanceSession, updateAttendanceSession } =
    useAttendanceMutations();
  const { activeYearId } = useActiveAcademicYear();

  const form = useForm<AttendanceSessionFormValues>({
    resolver: zodResolver(attendanceSessionSchema),
    defaultValues: {
      academicYearId: '',
      subjectId: '',
      sessionDate: formatLocalDateInputValue(),
      label: '',
      timetableSlotId: '',
    },
  });

  const academicYearId = form.watch('academicYearId') || activeYearId || '';
  const { data: subjects = [] } = useSubjectOptions(academicYearId);

  useEffect(() => {
    if (!record) {
      return;
    }
    form.reset({
      academicYearId: record.academicYearId,
      subjectId: record.subjectId,
      sessionDate: record.sessionDate,
      label: record.label ?? '',
      timetableSlotId: record.timetableSlotId ?? '',
    });
  }, [record, form]);

  useEffect(() => {
    if (!record && activeYearId) {
      form.setValue('academicYearId', activeYearId);
    }
  }, [record, activeYearId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && record) {
      await updateAttendanceSession.mutateAsync({ id: record.id, values });
      return;
    }
    await createAttendanceSession.mutateAsync(values);
  });

  const pending =
    createAttendanceSession.isPending || updateAttendanceSession.isPending;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6 max-w-lg">
        <FormField
          control={form.control}
          name="academicYearId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Academic year</FormLabel>
              <CurrentAcademicYearBadge className="mb-2" />
              <FormControl>
                <Input type="hidden" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subjectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!academicYearId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subjects.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.nameEn}
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
          name="sessionDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Morning session" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : isEdit ? (
              'Save session'
            ) : (
              'Create session'
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={onCancelHref}>Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
