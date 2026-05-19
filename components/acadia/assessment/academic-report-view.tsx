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
import {
  averageScores,
  computeStudentCourseAverages,
  formatMarkScore,
  isPassingScore,
  rankStudents,
} from '@/lib/acadia/assessment';
import {
  academicReportFiltersSchema,
  type AcademicReportFiltersValues,
} from '@/lib/acadia/assessment-schemas';
import {
  useAcademicYearOptions,
  useTermOptions,
} from '@/hooks/use-academic-calendar-options';
import {
  sequenceOptionLabel,
  useSequenceOptions,
} from '@/hooks/use-assessment-catalog-options';
import {
  useLevelsForSpecialty,
  useSpecialtyOptions,
} from '@/hooks/use-enrollment-catalog-options';
import { useAcadiaCollegeSession, isAcadiaTenantQueryEnabled } from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';

export type AcademicReportKind =
  | 'sequence'
  | 'term'
  | 'annual'
  | 'promotion';

const REPORT_TITLES: Record<AcademicReportKind, string> = {
  sequence: 'Sequence results',
  term: 'Term report card',
  annual: 'Annual academic summary',
  promotion: 'Promotion / admission statement',
};

export function AcademicReportView({ kind }: { kind: AcademicReportKind }) {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: years = [] } = useAcademicYearOptions();

  const form = useForm<AcademicReportFiltersValues>({
    resolver: zodResolver(academicReportFiltersSchema),
    defaultValues: {
      academicYearId: '',
      specialtyId: '',
      levelId: '',
      termId: '',
      sequenceId: '',
    },
  });

  const academicYearId = form.watch('academicYearId');
  const specialtyId = form.watch('specialtyId');
  const { data: specialties = [] } = useSpecialtyOptions();
  const { data: levels = [] } = useLevelsForSpecialty(specialtyId);
  const { data: sequences = [] } = useSequenceOptions(academicYearId);
  const { data: terms = [] } = useTermOptions(academicYearId);

  const [submitted, setSubmitted] = useState<AcademicReportFiltersValues | null>(
    null,
  );

  useEffect(() => {
    if (years.length > 0 && !academicYearId) {
      const current = years.find((y) => y.isCurrent);
      form.setValue('academicYearId', current?.id ?? years[0].id);
    }
  }, [years, academicYearId, form]);

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
          StudentProfile:studentProfileId (
            registrationNumber,
            User:userId ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', submitted.academicYearId)
        .eq('specialtyId', submitted.specialtyId)
        .eq('levelId', submitted.levelId)
        .eq('status', 'ACTIVE');

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
        .from('CourseMark')
        .select('studentProfileId, totalScore, examSessionId')
        .eq('tenantId', tenantId!)
        .in('examSessionId', sessionIds);

      if (marksError) {
        throw marksError;
      }

      const sessionMeta = new Map(
        (sessions ?? []).map((s) => [
          s.id as string,
          {
            termId: s.termId as string,
            sequenceNumber:
              unwrapRelation<{ number?: number }>(s.AcademicSequence)?.number ??
              null,
          },
        ]),
      );

      const marksByStudent = new Map<string, number[]>();

      for (const mark of marks ?? []) {
        const total =
          mark.totalScore != null ? Number(mark.totalScore) : null;
        if (total == null) {
          continue;
        }
        const meta = sessionMeta.get(mark.examSessionId as string);
        if (kind === 'term' && submitted.termId && meta?.termId !== submitted.termId) {
          continue;
        }
        if (
          kind === 'sequence' &&
          submitted.sequenceId &&
          meta?.sequenceNumber == null
        ) {
          continue;
        }
        const list = marksByStudent.get(mark.studentProfileId as string) ?? [];
        list.push(total);
        marksByStudent.set(mark.studentProfileId as string, list);
      }

      const ranked = rankStudents(
        Array.from(marksByStudent.entries()).map(([studentProfileId, scores]) => ({
          studentProfileId,
          average: averageScores(scores) ?? 0,
          courseCount: scores.length,
        })),
      );

      const enrollmentByStudent = new Map(
        (enrollments ?? []).map((e) => [
          e.studentProfileId as string,
          e.StudentProfile,
        ]),
      );

      return ranked.map((row) => {
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(enrollmentByStudent.get(row.studentProfileId));
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        return {
          ...row,
          name: user?.name ?? profile?.registrationNumber ?? row.studentProfileId,
          registrationNumber: profile?.registrationNumber ?? '—',
          passing: isPassingScore(row.average),
        };
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

  return (
    <div className="space-y-6">
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
                <FormLabel>Year</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
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
            name="specialtyId"
            render={({ field }) => (
              <FormItem className="min-w-[180px]">
                <FormLabel>Specialty</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Specialty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {specialties.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code}
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
                <FormLabel>Level</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Level" />
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
                  <FormLabel>Term</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Term" />
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
                  <FormLabel>Sequence</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sequence" />
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
          <Button type="submit">Generate</Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4 mr-1" />
            Print
          </Button>
        </form>
      </Form>

      <div className="print:p-8 space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Acadia College</h2>
          <p className="text-muted-foreground">{REPORT_TITLES[kind]}</p>
        </div>

        {reportQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Building report…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No data for the selected filters. Enter marks and generate again.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Average</TableHead>
                {kind === 'promotion' ? <TableHead>Decision</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.studentProfileId}>
                  <TableCell>{row.rank}</TableCell>
                  <TableCell>
                    {row.name}
                    <span className="block text-xs text-muted-foreground">
                      {row.registrationNumber}
                    </span>
                  </TableCell>
                  <TableCell>{formatMarkScore(row.average)}</TableCell>
                  {kind === 'promotion' ? (
                    <TableCell>
                      {row.passing ? 'Promoted / Admitted' : 'Repeat / Review'}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
