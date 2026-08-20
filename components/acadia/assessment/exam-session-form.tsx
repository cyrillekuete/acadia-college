'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
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
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EXAM_SESSION_TYPES } from '@/lib/acadia/assessment';
import {
  examSessionSchema,
  type ExamSessionFormValues,
} from '@/lib/acadia/assessment-schemas';
import { resolveExamPeriodWindow } from '@/lib/acadia/calendar-milestones';
import { requiresSequence } from '@/lib/acadia/exam-session-guards';
import { isDateWithinYearBounds } from '@/lib/acadia/academic-year-guards';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useTermOptions } from '@/hooks/use-academic-calendar-options';
import { useAcademicCalendarMilestones } from '@/hooks/use-academic-calendar-milestones';
import {
  sequenceOptionLabel,
  useSequenceOptions,
} from '@/hooks/use-assessment-catalog-options';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import { useAssessmentMutations } from '@/hooks/use-assessment-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { requireBrowserClient } from '@/lib/supabase/client';

export type ExamSessionFormRecord = ExamSessionFormValues & { id: string };

export function ExamSessionForm({
  record,
  onCancelHref,
}: {
  record?: ExamSessionFormRecord | null;
  onCancelHref: string;
}) {
  const { t } = useTranslation();
  const isEdit = !!record;
  const { createExamSession, updateExamSession } = useAssessmentMutations();
  const { activeYearId, activeYear } = useActiveAcademicYear();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const form = useForm<ExamSessionFormValues>({
    resolver: zodResolver(examSessionSchema),
    defaultValues: {
      academicYearId: '',
      subjectId: '',
      termId: '',
      sequenceId: '',
      type: 'NORMAL',
      startsOn: '',
      endsOn: '',
    },
  });

  const academicYearId = form.watch('academicYearId') || activeYearId || '';
  const termId = form.watch('termId');
  const examType = form.watch('type');
  const startsOn = form.watch('startsOn');
  const endsOn = form.watch('endsOn');
  const sequenceRequired = requiresSequence(examType);

  const { data: terms = [] } = useTermOptions(academicYearId);
  const { data: sequences = [] } = useSequenceOptions(academicYearId);
  const { data: subjects = [] } = useSubjectOptions(academicYearId);
  const { data: calendarContext } = useAcademicCalendarMilestones(academicYearId);

  const { data: yearMeta } = useQuery({
    queryKey: ['exam-session-year-meta', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('AcademicYear')
        .select('startsOn, endsOn, isActive')
        .eq('tenantId', tenantId!)
        .eq('id', academicYearId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data as {
        startsOn: string;
        endsOn: string;
        isActive: boolean;
      } | null;
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      academicYearId.length > 0,
  });

  const sequencesForTerm = sequences.filter((s) => s.termId === termId);
  const examPeriod = useMemo(
    () =>
      calendarContext
        ? resolveExamPeriodWindow(calendarContext.milestones)
        : { opensOn: null, closesOn: null },
    [calendarContext],
  );

  const dateHint = useMemo(() => {
    if (!startsOn || !endsOn || !yearMeta) {
      return null;
    }
    if (
      !isDateWithinYearBounds(startsOn, yearMeta.startsOn, yearMeta.endsOn) ||
      !isDateWithinYearBounds(endsOn, yearMeta.startsOn, yearMeta.endsOn)
    ) {
      return t('exams.datesOutsideYear', {
        startsOn: yearMeta.startsOn,
        endsOn: yearMeta.endsOn,
      });
    }
    if (
      examPeriod.opensOn &&
      startsOn < examPeriod.opensOn
    ) {
      return t('exams.datesOutsideExamPeriod', {
        opensOn: examPeriod.opensOn,
        closesOn: examPeriod.closesOn ?? '…',
      });
    }
    if (examPeriod.closesOn && endsOn > examPeriod.closesOn) {
      return t('exams.datesOutsideExamPeriod', {
        opensOn: examPeriod.opensOn ?? '…',
        closesOn: examPeriod.closesOn,
      });
    }
    return null;
  }, [startsOn, endsOn, yearMeta, examPeriod, t]);

  useEffect(() => {
    if (!record) {
      return;
    }
    form.reset({
      academicYearId: record.academicYearId,
      subjectId: record.subjectId,
      termId: record.termId,
      sequenceId: record.sequenceId ?? '',
      type: record.type,
      startsOn: record.startsOn,
      endsOn: record.endsOn,
    });
  }, [record, form]);

  useEffect(() => {
    if (!record && activeYearId) {
      form.setValue('academicYearId', activeYearId);
    }
  }, [record, activeYearId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: ExamSessionFormValues = sequenceRequired
      ? values
      : { ...values, sequenceId: '' };
    if (isEdit && record) {
      await updateExamSession.mutateAsync({ id: record.id, values: payload });
    } else {
      await createExamSession.mutateAsync(payload);
    }
  });

  const pending = createExamSession.isPending || updateExamSession.isPending;
  const yearClosed = yearMeta?.isActive === false || activeYear?.isActive === false;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5 max-w-xl">
        <FormField
          control={form.control}
          name="academicYearId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('exams.academicYear')}</FormLabel>
              <CurrentAcademicYearBadge />
              {yearClosed ? (
                <p className="text-xs text-muted-foreground">{t('exams.closedYearHint')}</p>
              ) : null}
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
              <FormLabel>{t('exams.subject')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('exams.selectSubject')} />
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
              {subjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('exams.noSubjects')}</p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('exams.examType')}</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  if (!requiresSequence(value)) {
                    form.setValue('sequenceId', '');
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXAM_SESSION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`exams.type.${type}`)}
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
              <FormLabel>{t('exams.term')}</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue('sequenceId', '');
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('exams.selectTerm')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {t('catalog.termN', { number: term.number })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {sequenceRequired ? (
          <FormField
            control={form.control}
            name="sequenceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('exams.sequenceRequired')}</FormLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('exams.selectSequence')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startsOn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('exams.startsOn')}</FormLabel>
                <FormControl>
                  <DatePickerInput
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
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
                <FormLabel>{t('exams.endsOn')}</FormLabel>
                <FormControl>
                  <DatePickerInput
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {dateHint ? (
          <p className="text-xs text-destructive">{dateHint}</p>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending || subjects.length === 0}>
            {pending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : isEdit ? (
              t('common.messages.saveChanges')
            ) : (
              t('exams.createSession')
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={onCancelHref}>{t('common.buttons.cancel')}</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
