'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from 'lucide-react';
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
  EXAM_SESSION_TYPES,
  examSessionTypeLabel,
} from '@/lib/acadia/assessment';
import {
  examSessionSchema,
  type ExamSessionFormValues,
} from '@/lib/acadia/assessment-schemas';
import {
  useAcademicYearOptions,
  useTermOptions,
} from '@/hooks/use-academic-calendar-options';
import {
  sequenceOptionLabel,
  useSequenceOptions,
} from '@/hooks/use-assessment-catalog-options';
import { useCourseOptions } from '@/hooks/use-course-catalog-options';
import { useAssessmentMutations } from '@/hooks/use-assessment-mutations';

export type ExamSessionFormRecord = ExamSessionFormValues & { id: string };

export function ExamSessionForm({
  record,
  onCancelHref,
}: {
  record?: ExamSessionFormRecord | null;
  onCancelHref: string;
}) {
  const isEdit = !!record;
  const { createExamSession, updateExamSession } = useAssessmentMutations();
  const { data: years = [] } = useAcademicYearOptions();

  const form = useForm<ExamSessionFormValues>({
    resolver: zodResolver(examSessionSchema),
    defaultValues: {
      academicYearId: '',
      courseId: '',
      termId: '',
      sequenceId: '',
      type: 'NORMAL',
      startsOn: '',
      endsOn: '',
    },
  });

  const academicYearId = form.watch('academicYearId');
  const termId = form.watch('termId');
  const { data: terms = [] } = useTermOptions(academicYearId);
  const { data: sequences = [] } = useSequenceOptions(academicYearId);
  const { data: courses = [] } = useCourseOptions(academicYearId);

  const sequencesForTerm = sequences.filter((s) => s.termId === termId);

  useEffect(() => {
    if (!record) {
      return;
    }
    form.reset({
      academicYearId: record.academicYearId,
      courseId: record.courseId,
      termId: record.termId,
      sequenceId: record.sequenceId ?? '',
      type: record.type,
      startsOn: record.startsOn,
      endsOn: record.endsOn,
    });
  }, [record, form]);

  useEffect(() => {
    if (!record && years.length > 0 && !academicYearId) {
      const current = years.find((y) => y.isCurrent);
      form.setValue('academicYearId', current?.id ?? years[0].id);
    }
  }, [years, academicYearId, record, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && record) {
      await updateExamSession.mutateAsync({ id: record.id, values });
    } else {
      await createExamSession.mutateAsync(values);
    }
  });

  const pending = createExamSession.isPending || updateExamSession.isPending;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5 max-w-xl">
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
                      {y.isCurrent ? ' (current)' : ''}
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
          name="courseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {courses.map((c) => (
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
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exam type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXAM_SESSION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {examSessionTypeLabel(t)}
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
          name="termId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Term</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {terms.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      Term {t.number}
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
          name="sequenceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sequence (optional)</FormLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="No sequence" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">No sequence</SelectItem>
                  {sequencesForTerm.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {sequenceOptionLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startsOn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starts on</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endsOn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ends on</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create exam session'
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
