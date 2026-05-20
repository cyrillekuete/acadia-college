'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  detectAttendancePatterns,
  formatAttendancePercentage,
  patternFlagLabel,
  summarizeStudentAttendance,
  type AttendanceStatus,
} from '@/lib/acadia/attendance';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import {
  useAcadiaCollegeSession,
  isAcadiaTenantQueryEnabled,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';

const ALL_SUBJECTS = '__all__';

export function AttendanceAnalyticsPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: years = [] } = useAcademicYearOptions();
  const [academicYearId, setAcademicYearId] = useState('');
  const [subjectId, setSubjectId] = useState(ALL_SUBJECTS);
  const { data: subjects = [] } = useSubjectOptions(academicYearId);

  const query = useQuery({
    queryKey: ['attendance-analytics', tenantId, academicYearId, subjectId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let sessionQuery = supabase
        .from('AttendanceSession')
        .select('id')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', academicYearId);
      if (subjectId !== ALL_SUBJECTS) {
        sessionQuery = sessionQuery.eq('subjectId', subjectId);
      }
      const { data: sessions, error: sessionError } = await sessionQuery;
      if (sessionError) {
        throw sessionError;
      }
      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) {
        return { patterns: [], atRisk: 0, avgRate: null };
      }

      const { data: records, error: recordsError } = await supabase
        .from('AttendanceRecord')
        .select(
          `
          studentProfileId,
          status,
          StudentProfile:studentProfileId (
            registrationNumber,
            User:userId ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .in('attendanceSessionId', sessionIds);

      if (recordsError) {
        throw recordsError;
      }

      const summaries = summarizeStudentAttendance(
        (records ?? []).map((r) => ({
          studentProfileId: r.studentProfileId as string,
          status: r.status as AttendanceStatus,
        })),
      );

      const patterns = detectAttendancePatterns(summaries).map((insight) => {
        const record = (records ?? []).find(
          (r) => r.studentProfileId === insight.studentProfileId,
        );
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(record?.StudentProfile);
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        return {
          ...insight,
          name: user?.name ?? profile?.registrationNumber ?? '—',
          registrationNumber: profile?.registrationNumber ?? '—',
        };
      });

      const rates = summaries
        .map((s) => s.percentage)
        .filter((p): p is number => p != null);
      const avgRate =
        rates.length > 0
          ? Math.round(
              (rates.reduce((a, b) => a + b, 0) / rates.length) * 10,
            ) / 10
          : null;

      return {
        patterns,
        atRisk: patterns.length,
        avgRate,
      };
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!academicYearId,
  });

  const patterns = useMemo(() => query.data?.patterns ?? [], [query.data?.patterns]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[180px]">
          <p className="text-sm font-medium mb-1.5">Academic year</p>
          <Select
            value={academicYearId}
            onValueChange={(value) => {
              setAcademicYearId(value);
              setSubjectId(ALL_SUBJECTS);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px]">
          <p className="text-sm font-medium mb-1.5">Subject (optional)</p>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SUBJECTS}>All subjects</SelectItem>
              {subjects.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Analyzing…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(query.error)}
        </p>
      ) : (
        <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Class average attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatAttendancePercentage(query.data?.avgRate ?? null)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Students flagged
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {query.data?.atRisk ?? 0}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Attendance patterns</h3>
        {patterns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No concerning patterns detected for this scope.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patterns.map((row) => (
                <TableRow key={row.studentProfileId}>
                  <TableCell>
                    <span className="font-medium">{row.name}</span>
                    <span className="text-muted-foreground text-xs block">
                      {row.registrationNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatAttendancePercentage(row.percentage)}
                  </TableCell>
                  <TableCell>{row.absent}</TableCell>
                  <TableCell>{row.late}</TableCell>
                  <TableCell className="space-x-1">
                    {row.flags.map((flag) => (
                      <Badge key={flag} variant="outline">
                        {patternFlagLabel(flag)}
                      </Badge>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
        </>
      )}
    </div>
  );
}
