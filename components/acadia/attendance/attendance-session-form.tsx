'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  attendanceSessionSchema,
  type AttendanceSessionFormValues,
} from '@/lib/acadia/attendance-schemas';
import { isSessionDateInAcademicYear } from '@/lib/acadia/attendance';
import { formatLocalDateInputValue } from '@/lib/acadia/dates';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useClassesForFilters } from '@/hooks/use-enrollment-catalog-options';
import { useAttendanceMutations } from '@/hooks/use-attendance-mutations';
import { useTranslation } from '@/hooks/useTranslation';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';

export type AttendanceSessionFormRecord = AttendanceSessionFormValues & {
  id: string;
};

export const ATTENDANCE_SESSION_FORM_ID = 'attendance-session-form';

export function AttendanceSessionForm({
  record,
  onCancelHref,
  onCancel,
  hideActions = false,
  formId = ATTENDANCE_SESSION_FORM_ID,
  onPendingChange,
}: {
  record?: AttendanceSessionFormRecord | null;
  onCancelHref?: string;
  onCancel?: () => void;
  hideActions?: boolean;
  formId?: string;
  onPendingChange?: (pending: boolean) => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!record;
  const { createAttendanceSession, updateAttendanceSession } =
    useAttendanceMutations();
  const { activeYearId, activeYear } = useActiveAcademicYear();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: classes = [] } = useClassesForFilters();
  const [clearOrphans, setClearOrphans] = useState(false);

  const form = useForm<AttendanceSessionFormValues>({
    resolver: zodResolver(attendanceSessionSchema),
    defaultValues: {
      academicYearId: '',
      classId: '',
      subjectId: '',
      sessionDate: formatLocalDateInputValue(),
      label: '',
      timetableSlotId: '',
    },
  });

  const academicYearId = form.watch('academicYearId') || activeYearId || '';
  const classId = form.watch('classId');

  const yearBoundsQuery = useQuery({
    queryKey: ['attendance-year-bounds', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('AcademicYear')
        .select('startsOn, endsOn')
        .eq('tenantId', tenantId!)
        .eq('id', academicYearId)
        .single();
      if (error) {
        throw error;
      }
      return {
        startsOn: (data.startsOn as string | null) ?? null,
        endsOn: (data.endsOn as string | null) ?? null,
      };
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!academicYearId,
  });

  const subjectsForClassQuery = useQuery({
    queryKey: ['attendance-subjects-for-class', tenantId, classId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('ClassSubject')
        .select(
          `
          subjectId,
          Subject!ClassSubject_subjectId_tenantId_fkey (
            id,
            code,
            nameEn,
            academicYearId,
            deactivatedAt
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('classId', classId);
      if (error) {
        throw error;
      }
      return (data ?? [])
        .map((row) => {
          const subject = Array.isArray(row.Subject) ? row.Subject[0] : row.Subject;
          if (!subject || subject.deactivatedAt) {
            return null;
          }
          if (
            subject.academicYearId &&
            academicYearId &&
            subject.academicYearId !== academicYearId
          ) {
            return null;
          }
          return {
            id: subject.id as string,
            code: subject.code as string,
            nameEn: subject.nameEn as string,
          };
        })
        .filter((row): row is { id: string; code: string; nameEn: string } => row != null)
        .sort((a, b) => a.code.localeCompare(b.code));
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!classId,
  });

  const subjects = subjectsForClassQuery.data ?? [];

  useEffect(() => {
    if (!record) {
      return;
    }
    form.reset({
      academicYearId: record.academicYearId,
      classId: record.classId,
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

  useEffect(() => {
    const currentSubject = form.getValues('subjectId');
    if (currentSubject && subjects.length > 0) {
      if (!subjects.some((s) => s.id === currentSubject)) {
        form.setValue('subjectId', '');
      }
    }
  }, [subjects, form]);

  const yearBoundsLabel = useMemo(() => {
    const starts = yearBoundsQuery.data?.startsOn;
    const ends = yearBoundsQuery.data?.endsOn;
    if (!starts && !ends) {
      return null;
    }
    return t('exams.datesOutsideYear', {
      startsOn: starts ?? '—',
      endsOn: ends ?? '—',
    });
  }, [t, yearBoundsQuery.data]);

  const onSubmit = form.handleSubmit(async (values) => {
    const bounds = yearBoundsQuery.data;
    if (
      bounds &&
      !isSessionDateInAcademicYear(values.sessionDate, bounds.startsOn, bounds.endsOn)
    ) {
      form.setError('sessionDate', {
        message: yearBoundsLabel ?? t('exams.datesOutsideYear', {
          startsOn: bounds.startsOn ?? '—',
          endsOn: bounds.endsOn ?? '—',
        }),
      });
      return;
    }

    if (isEdit && record) {
      const scopeChanged =
        record.classId !== values.classId || record.subjectId !== values.subjectId;
      if (scopeChanged && !clearOrphans) {
        const confirmed = window.confirm(
          t('attendance.confirmClearMarksOnScopeChange'),
        );
        if (!confirmed) {
          return;
        }
        setClearOrphans(true);
        try {
          await updateAttendanceSession.mutateAsync({
            id: record.id,
            values,
            clearOrphanRecords: true,
          });
        } finally {
          setClearOrphans(false);
        }
        return;
      }
      await updateAttendanceSession.mutateAsync({
        id: record.id,
        values,
        clearOrphanRecords: clearOrphans,
      });
      return;
    }
    try {
      await createAttendanceSession.mutateAsync(values);
    } catch {
      // Error toast handled by mutation onError
    }
  });

  const pending =
    createAttendanceSession.isPending || updateAttendanceSession.isPending;

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={onSubmit}
        className={hideActions ? 'space-y-4' : 'space-y-6 max-w-lg'}
      >
        <FormField
          control={form.control}
          name="academicYearId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('students.academicYear')}</FormLabel>
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
          name="classId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('students.class')}</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue('subjectId', '');
                }}
                disabled={!academicYearId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('attendance.selectClass')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
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
              <FormLabel>{t('students.subject')}</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!classId || subjectsForClassQuery.isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('attendance.selectSubject')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subjects.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      {t('attendance.noSubjectsForClass')}
                    </SelectItem>
                  ) : (
                    subjects.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.nameEn}
                      </SelectItem>
                    ))
                  )}
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
              <FormLabel>{t('attendance.sessionDate')}</FormLabel>
              <FormControl>
                <DatePickerInput
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              </FormControl>
              {activeYear?.label ? (
                <p className="text-xs text-muted-foreground">
                  {activeYear.label}
                  {yearBoundsQuery.data?.startsOn && yearBoundsQuery.data?.endsOn
                    ? ` (${yearBoundsQuery.data.startsOn} – ${yearBoundsQuery.data.endsOn})`
                    : null}
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('attendance.labelOptional')}</FormLabel>
              <FormControl>
                <Input placeholder={t('attendance.labelPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {hideActions ? null : (
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : isEdit ? (
                t('attendance.saveSession')
              ) : (
                t('attendance.createSession')
              )}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('common.buttons.cancel')}
              </Button>
            ) : onCancelHref ? (
              <Button type="button" variant="outline" asChild>
                <Link href={onCancelHref}>{t('common.buttons.cancel')}</Link>
              </Button>
            ) : null}
          </div>
        )}
      </form>
    </Form>
  );
}
