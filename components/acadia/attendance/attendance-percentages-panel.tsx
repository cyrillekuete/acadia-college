'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

export function AttendancePercentagesPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const [subjectId, setSubjectId] = useState(ALL_SUBJECTS);
  const { data: subjects = [] } = useSubjectOptions(activeYearId ?? '');

  const query = useQuery({
    queryKey: ['attendance-percentages', tenantId, activeYearId, subjectId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let sessionQuery = supabase
        .from('AttendanceSession')
        .select('id')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!);
      if (subjectId !== ALL_SUBJECTS) {
        sessionQuery = sessionQuery.eq('subjectId', subjectId);
      }
      const { data: sessions, error: sessionError } = await sessionQuery;
      if (sessionError) {
        throw sessionError;
      }
      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) {
        return [];
      }

      const { data: records, error: recordsError } = await supabase
        .from('AttendanceRecord')
        .select(
          `
          studentProfileId,
          status,
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

      const summaries = summarizeStudentAttendance(
        (records ?? []).map((r) => ({
          studentProfileId: r.studentProfileId as string,
          status: r.status as AttendanceStatus,
        })),
      );

      return summaries
        .map((summary) => {
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
        })
        .sort((a, b) => (a.percentage ?? 100) - (b.percentage ?? 100));
    },
    enabled:
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <CurrentAcademicYearBadge />
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
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          {getQueryErrorMessage(query.error)}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No attendance records for this scope.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Present</TableHead>
              <TableHead>Absent</TableHead>
              <TableHead>Late</TableHead>
              <TableHead>Excused</TableHead>
              <TableHead>Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.studentProfileId}>
                <TableCell>
                  <span className="font-medium">{row.name}</span>
                  <span className="text-muted-foreground text-xs block">
                    {row.registrationNumber}
                  </span>
                </TableCell>
                <TableCell>{row.sessions}</TableCell>
                <TableCell>{row.present}</TableCell>
                <TableCell>{row.absent}</TableCell>
                <TableCell>{row.late}</TableCell>
                <TableCell>{row.excused}</TableCell>
                <TableCell>{formatAttendancePercentage(row.percentage)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
