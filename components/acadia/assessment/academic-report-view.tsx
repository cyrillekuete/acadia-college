'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Printer } from '@/lib/icons';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMarkScore } from '@/lib/acadia/assessment';
import { buildAcademicReportRankings } from '@/lib/acadia/academic-report';
import {
  academicReportFiltersSchema,
  type AcademicReportFiltersValues,
} from '@/lib/acadia/assessment-schemas';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  branchLabel,
  subSystemLabel,
} from '@/lib/acadia/education-system';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useTermOptions } from '@/hooks/use-academic-calendar-options';
import {
  sequenceOptionLabel,
  useSequenceOptions,
} from '@/hooks/use-assessment-catalog-options';
import { useLevelsForStream } from '@/hooks/use-enrollment-catalog-options';
import {
  useAcadiaCollegeSession,
  isAcadiaTenantQueryEnabled,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

export type AcademicReportKind = 'sequence' | 'term' | 'annual';

const REPORT_TITLE_KEYS: Record<AcademicReportKind, string> = {
  sequence: 'marks.reportKind.sequence',
  term: 'marks.reportKind.term',
  annual: 'marks.reportKind.annual',
};

export function AcademicReportView({ kind }: { kind: AcademicReportKind }) {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  const form = useForm<AcademicReportFiltersValues>({
    resolver: zodResolver(academicReportFiltersSchema),
    defaultValues: {
      academicYearId: '',
      subSystem: 'ENGLISH',
      branch: 'GRAMMAR',
      levelId: '',
      termId: '',
      sequenceId: '',
    },
  });

  const academicYearId = form.watch('academicYearId') || activeYearId || '';
  const subSystem = form.watch('subSystem');
  const branch = form.watch('branch');
  const { data: levels = [] } = useLevelsForStream(subSystem, branch);
  const { data: sequences = [] } = useSequenceOptions(academicYearId);
  const { data: terms = [] } = useTermOptions(academicYearId);

  const [submitted, setSubmitted] = useState<AcademicReportFiltersValues | null>(
    null,
  );

  useEffect(() => {
    if (activeYearId) {
      form.setValue('academicYearId', activeYearId);
    }
  }, [activeYearId, form]);

  useEffect(() => {
    const current = form.getValues('levelId');
    if (current && !levels.some((l) => l.id === current)) {
      form.setValue('levelId', '');
    }
  }, [subSystem, branch, levels, form]);

  const reportQuery = useQuery({
    queryKey: ['academic-report', kind, tenantId, submitted],
    queryFn: async () => {
      if (!submitted) {
        return [];
      }
      const supabase = requireBrowserClient();

      const { data: enrollments, error: enrollError } = await supabase
        .from('StudentEnrollment')
        .select(
          `
          studentProfileId,
          StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', submitted.academicYearId)
        .eq('subSystem', submitted.subSystem)
        .eq('branch', submitted.branch)
        .eq('levelId', submitted.levelId)
        .eq('status', 'ENROLLED');

      if (enrollError) {
        throw enrollError;
      }

      let examQuery = supabase
        .from('ExamSession')
        .select('id, termId, sequenceId, AcademicSequence:sequenceId ( number )')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', submitted.academicYearId);

      if (kind === 'sequence' && submitted.sequenceId) {
        examQuery = examQuery.eq('sequenceId', submitted.sequenceId);
      } else if (kind === 'term' && submitted.termId) {
        examQuery = examQuery.eq('termId', submitted.termId);
      }

      const { data: sessions, error: sessionError } = await examQuery;
      if (sessionError) {
        throw sessionError;
      }

      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) {
        return [];
      }

      const { data: marks, error: marksError } = await supabase
        .from('SubjectMark')
        .select(
          `
          studentProfileId,
          subjectId,
          subjectSubBranchId,
          totalScore,
          examSessionId,
          Subject!SubjectMark_subjectId_tenantId_fkey ( coefficient ),
          SubjectSubBranch!SubjectMark_subjectSubBranchId_tenantId_fkey ( coefficient )
        `,
        )
        .eq('tenantId', tenantId!)
        .in('examSessionId', sessionIds);

      if (marksError) {
        throw marksError;
      }

      const sessionMeta = new Map(
        (sessions ?? []).map((s) => [
          s.id as string,
          {
            termId: s.termId as string | null,
            sequenceId: (s.sequenceId as string | null) ?? null,
            sequenceNumber:
              unwrapRelation<{ number?: number }>(s.AcademicSequence)?.number ??
              null,
          },
        ]),
      );

      const snapshots = (marks ?? []).flatMap((mark) => {
        const total =
          mark.totalScore != null ? Number(mark.totalScore) : null;
        if (total == null) {
          return [];
        }
        const meta = sessionMeta.get(mark.examSessionId as string);
        if (kind === 'term' && submitted.termId && meta?.termId !== submitted.termId) {
          return [];
        }
        if (
          kind === 'sequence' &&
          submitted.sequenceId &&
          meta?.sequenceNumber == null
        ) {
          return [];
        }
        const subject = unwrapRelation<{ coefficient?: number | null }>(mark.Subject);
        const subBranch = unwrapRelation<{ coefficient?: number | null }>(
          mark.SubjectSubBranch,
        );
        return [
          {
            studentProfileId: mark.studentProfileId as string,
            subjectId: mark.subjectId as string,
            totalScore: total,
            sequenceId: meta?.sequenceId ?? null,
            termId: meta?.termId ?? null,
            subjectSubBranchId: (mark.subjectSubBranchId as string | null) ?? null,
            subjectCoefficient:
              subject?.coefficient != null ? Number(subject.coefficient) : 1,
            subBranchCoefficient:
              subBranch?.coefficient != null ? Number(subBranch.coefficient) : null,
          },
        ];
      });

      const enrollmentByStudent = new Map(
        (enrollments ?? []).map((e) => [
          e.studentProfileId as string,
          unwrapRelation<{
            registrationNumber?: string;
            User?: unknown;
          }>(e.StudentProfile) ?? undefined,
        ]),
      );
      const enrolledStudentIds = new Set(enrollmentByStudent.keys());

      return buildAcademicReportRankings({
        snapshots,
        enrolledStudentIds,
        enrollmentByStudent,
      });
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!submitted,
  });

  const rows = useMemo(() => reportQuery.data ?? [], [reportQuery.data]);

  const onSubmit = form.handleSubmit((values) => {
    setSubmitted(values);
  });

  const showTermField = kind === 'term';
  const showSequenceField = kind === 'sequence';
  const emptyMessage = submitted
    ? t('marks.reportEmpty')
    : t('marks.reportPrompt');

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          .academic-report-print { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
      <Form {...form}>
        <form
          onSubmit={onSubmit}
          className="flex flex-wrap gap-4 items-end print:hidden"
        >
          <FormField
            control={form.control}
            name="academicYearId"
            render={({ field }) => (
              <FormItem className="min-w-[160px]">
                <FormLabel>{t('marks.year')}</FormLabel>
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
            name="subSystem"
            render={({ field }) => (
              <FormItem className="min-w-[180px]">
                <FormLabel>{t('marks.subSystem')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('marks.subSystem')} />
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
              <FormItem className="min-w-[160px]">
                <FormLabel>{t('marks.branch')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('marks.branch')} />
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
          <FormField
            control={form.control}
            name="levelId"
            render={({ field }) => (
              <FormItem className="min-w-[140px]">
                <FormLabel>{t('marks.level')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('marks.level')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {levels.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.labelEn ?? `Level ${l.number}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {showTermField ? (
            <FormField
              control={form.control}
              name="termId"
              render={({ field }) => (
                <FormItem className="min-w-[120px]">
                  <FormLabel>{t('marks.term')}</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('marks.term')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>
                          {t('marks.termNumber', { number: term.number })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          ) : null}
          {showSequenceField ? (
            <FormField
              control={form.control}
              name="sequenceId"
              render={({ field }) => (
                <FormItem className="min-w-[180px]">
                  <FormLabel>{t('marks.sequence')}</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('marks.sequence')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sequences.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {sequenceOptionLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          ) : null}
          <Button type="submit">{t('marks.generateReport')}</Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4 mr-1" />
            {t('common.buttons.print')}
          </Button>
        </form>
      </Form>

      <div className="academic-report-print print:p-8 space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Acadia College</h2>
          <p className="text-muted-foreground">{t(REPORT_TITLE_KEYS[kind])}</p>
        </div>

        {reportQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{t('marks.buildingReport')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('marks.rank')}</TableHead>
                <TableHead>{t('marks.student')}</TableHead>
                <TableHead>{t('marks.average')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.studentProfileId} className="break-inside-avoid">
                  <TableCell>{row.rank}</TableCell>
                  <TableCell>
                    {row.name}
                    <span className="block text-xs text-muted-foreground">
                      {row.registrationNumber}
                    </span>
                  </TableCell>
                  <TableCell>{formatMarkScore(row.average)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
