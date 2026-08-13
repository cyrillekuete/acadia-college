'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  ATTENDANCE_ROSTER_ENROLLMENT_STATUS,
  ATTENDANCE_STATUSES,
  attendanceStatusLabel,
  type AttendanceStatus,
} from '@/lib/acadia/attendance';
import type { AttendanceRecordEntryValues } from '@/lib/acadia/attendance-schemas';
import { useAttendanceMutations } from '@/hooks/use-attendance-mutations';
import {
  useAcadiaCollegeSession,
  isAcadiaTenantQueryEnabled,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';

type StudentRow = {
  id: string;
  registrationNumber: string;
  User?: unknown;
};

type RecordDraft = AttendanceRecordEntryValues;

export function AttendanceEntryGrid({
  attendanceSessionId,
  academicYearId,
  subjectId,
  readOnly = false,
}: {
  attendanceSessionId: string;
  academicYearId: string;
  subjectId: string;
  readOnly?: boolean;
}) {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const [drafts, setDrafts] = useState<Record<string, RecordDraft>>({});
  const [notifyGuardians, setNotifyGuardians] = useState(true);
  const { saveAttendanceEntry } = useAttendanceMutations();

  const rosterQuery = useQuery({
    queryKey: [
      'attendance-entry',
      tenantId,
      attendanceSessionId,
      academicYearId,
      subjectId,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();

      const { data: subject, error: subjectError } = await supabase
        .from('Subject')
        .select('subSystem, branch, levelId')
        .eq('id', subjectId)
        .single();
      if (subjectError) {
        throw subjectError;
      }

      const { data: enrollments, error: enrollError } = await supabase
        .from('StudentEnrollment')
        .select(
          `
          studentProfileId,
          StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey (
            id,
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', academicYearId)
        .eq('subSystem', subject.subSystem)
        .eq('branch', subject.branch)
        .eq('levelId', subject.levelId)
        .eq('status', ATTENDANCE_ROSTER_ENROLLMENT_STATUS);

      if (enrollError) {
        throw enrollError;
      }

      const students: StudentRow[] = (enrollments ?? []).map((row) => {
        const profile = unwrapRelation<StudentRow>(row.StudentProfile);
        return (
          profile ?? {
            id: row.studentProfileId as string,
            registrationNumber: '—',
          }
        );
      });

      const { data: records, error: recordsError } = await supabase
        .from('AttendanceRecord')
        .select('id, studentProfileId, status')
        .eq('tenantId', tenantId!)
        .eq('attendanceSessionId', attendanceSessionId);

      if (recordsError) {
        throw recordsError;
      }

      return { students, records: records ?? [] };
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!attendanceSessionId &&
      !!academicYearId &&
      !!subjectId,
  });

  useEffect(() => {
    if (!rosterQuery.data) {
      return;
    }
    const recordByStudent = new Map(
      rosterQuery.data.records.map((r) => [
        r.studentProfileId as string,
        r.status as AttendanceStatus,
      ]),
    );
    const next: Record<string, RecordDraft> = {};
    for (const student of rosterQuery.data.students) {
      next[student.id] = {
        studentProfileId: student.id,
        status: recordByStudent.get(student.id) ?? 'PRESENT',
      };
    }
    setDrafts(next);
  }, [rosterQuery.data]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setDrafts((prev) => {
      const current = prev[studentId];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [studentId]: { ...current, status },
      };
    });
  };

  const handleSave = async () => {
    await saveAttendanceEntry.mutateAsync({
      attendanceSessionId,
      records: Object.values(drafts),
      notifyGuardians,
    });
  };

  const studentRows = useMemo(
    () => rosterQuery.data?.students ?? [],
    [rosterQuery.data?.students],
  );

  if (rosterQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading roster…</p>;
  }

  if (rosterQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {getQueryErrorMessage(rosterQuery.error)}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studentRows.map((student) => {
            const user = unwrapRelation<{ name?: string }>(student.User);
            const draft = drafts[student.id];
            return (
              <TableRow key={student.id}>
                <TableCell>
                  <span className="font-medium">
                    {user?.name ?? student.registrationNumber}
                  </span>
                  <span className="text-muted-foreground text-xs block">
                    Student ID: {student.registrationNumber}
                  </span>
                </TableCell>
                <TableCell>
                  <Select
                    value={draft?.status ?? 'PRESENT'}
                    disabled={readOnly}
                    onValueChange={(value) =>
                      updateStatus(student.id, value as AttendanceStatus)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {attendanceStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={notifyGuardians}
              onCheckedChange={(checked) =>
                setNotifyGuardians(checked === true)
              }
            />
            Notify guardians for absences and lateness
          </label>
          <Button
            type="button"
            disabled={saveAttendanceEntry.isPending || studentRows.length === 0}
            onClick={() => void handleSave()}
          >
            {saveAttendanceEntry.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              'Save attendance'
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
