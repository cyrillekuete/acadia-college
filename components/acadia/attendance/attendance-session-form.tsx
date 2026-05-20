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
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
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
  const { data: years = [] } = useAcademicYearOptions();

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

  const academicYearId = form.watch('academicYearId');
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
    if (record || years.length === 0) {
      return;
    }
    const current = years.find((y) => y.isCurrent);
    if (current) {
      form.setValue('academicYearId', current.id);
    }
  }, [years, record, form]);

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
