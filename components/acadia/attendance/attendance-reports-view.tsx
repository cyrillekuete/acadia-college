'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  countAttendanceStatuses,
  formatAttendancePercentage,
  summarizeStudentAttendance,
  type AttendanceStatus,
} from '@/lib/acadia/attendance';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import {
  useAcadiaCollegeSession,
  isAcadiaTenantQueryEnabled,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';

const ALL_SUBJECTS = '__all__';

export function AttendanceReportsView() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const [subjectId, setSubjectId] = useState(ALL_SUBJECTS);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const { data: subjects = [] } = useSubjectOptions(activeYearId ?? '');

  const query = useQuery({
    queryKey: [
      'attendance-reports',
      tenantId,
      activeYearId,
      subjectId,
      fromDate,
      toDate,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let sessionQuery = supabase
        .from('AttendanceSession')
        .select('id, sessionDate, label, Subject!AttendanceSession_subjectId_tenantId_fkey ( code )')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!)
        .order('sessionDate', { ascending: false });

      if (subjectId !== ALL_SUBJECTS) {
        sessionQuery = sessionQuery.eq('subjectId', subjectId);
      }
      if (fromDate) {
        sessionQuery = sessionQuery.gte('sessionDate', fromDate);
      }
      if (toDate) {
        sessionQuery = sessionQuery.lte('sessionDate', toDate);
      }

      const { data: sessions, error: sessionError } = await sessionQuery;
      if (sessionError) {
        throw sessionError;
      }

      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) {
        return { sessions: [], summaries: [], totals: countAttendanceStatuses([]) };
      }

      const { data: records, error: recordsError } = await supabase
        .from('AttendanceRecord')
        .select(
          `
          studentProfileId,
          status,
          attendanceSessionId,
          StudentProfile!AttendanceRecord_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .in('attendanceSessionId', sessionIds);

      if (recordsError) {
        throw recordsError;
      }

      const statuses = (records ?? []).map(
        (r) => r.status as AttendanceStatus,
      );
      const summaries = summarizeStudentAttendance(
        (records ?? []).map((r) => ({
          studentProfileId: r.studentProfileId as string,
          status: r.status as AttendanceStatus,
        })),
      ).map((summary) => {
        const record = (records ?? []).find(
          (r) => r.studentProfileId === summary.studentProfileId,
        );
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(record?.StudentProfile);
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        return {
          ...summary,
          name: user?.name ?? profile?.registrationNumber ?? '—',
          registrationNumber: profile?.registrationNumber ?? '—',
        };
      });

      return {
        sessions: sessions ?? [],
        summaries,
        totals: countAttendanceStatuses(statuses),
      };
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const data = query.data;
  const summaries = useMemo(() => data?.summaries ?? [], [data?.summaries]);

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap gap-4 print:hidden">
        <CurrentAcademicYearBadge />
        <div className="min-w-[200px]">
          <p className="text-sm font-medium mb-1.5">Subject</p>
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
        <div className="min-w-[160px]">
          <p className="text-sm font-medium mb-1.5">From</p>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="min-w-[160px]">
          <p className="text-sm font-medium mb-1.5">To</p>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      {query.isLoading || query.isFetching ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(query.error)}
        </p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {data.sessions.length}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Present</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {data.totals.present}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {data.totals.absent}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Late</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {data.totals.late}
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Student summaries</h3>
            {summaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No records in range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Attendance rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((row) => (
                    <TableRow key={row.studentProfileId}>
                      <TableCell>
                        <span className="font-medium">{row.name}</span>
                        <span className="text-muted-foreground text-xs block">
                          {row.registrationNumber}
                        </span>
                      </TableCell>
                      <TableCell>{row.sessions}</TableCell>
                      <TableCell>{row.absent}</TableCell>
                      <TableCell>{row.late}</TableCell>
                      <TableCell>
                        {formatAttendancePercentage(row.percentage)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Recent sessions</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Label</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sessions.slice(0, 20).map((s) => {
                  const subject = unwrapRelation<{ code?: string }>(s.Subject);
                  return (
                    <TableRow key={s.id as string}>
                      <TableCell>{s.sessionDate as string}</TableCell>
                      <TableCell>{subject?.code ?? '—'}</TableCell>
                      <TableCell>{(s.label as string) ?? '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </div>
  );
}
