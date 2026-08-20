'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
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
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { AttendanceDataGrid } from '@/components/acadia/attendance/attendance-data-grid';
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
import { unwrapRelation } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

type StudentRow = {
  id: string;
  registrationNumber: string;
  User?: unknown;
};

type RecordDraft = AttendanceRecordEntryValues;

const DEFAULT_COLUMN_ORDER = ['student', 'status'];

export function AttendanceEntryGrid({
  attendanceSessionId,
  academicYearId,
  classId,
  readOnly = false,
}: {
  attendanceSessionId: string;
  academicYearId: string;
  classId: string | null;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const [drafts, setDrafts] = useState<Record<string, RecordDraft>>({});
  const [notifyGuardians, setNotifyGuardians] = useState(true);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);
  const { saveAttendanceEntry } = useAttendanceMutations();

  const rosterQuery = useQuery({
    queryKey: [
      'attendance-entry',
      tenantId,
      attendanceSessionId,
      academicYearId,
      classId,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();

      if (!classId) {
        return { students: [] as StudentRow[], records: [] };
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
        .eq('classId', classId)
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
      !!classId,
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

  const columns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
      {
        id: 'student',
        accessorFn: (row) => {
          const user = unwrapRelation<{ name?: string }>(row.User);
          return user?.name ?? row.registrationNumber;
        },
        header: ({ column }) => (
          <DataGridColumnHeader title="Student" visibility column={column} />
        ),
        cell: ({ row }) => {
          const user = unwrapRelation<{ name?: string }>(row.original.User);
          return (
            <>
              <span className="font-medium">
                {user?.name ?? row.original.registrationNumber}
              </span>
              <span className="text-muted-foreground text-xs block">
                Student ID: {row.original.registrationNumber}
              </span>
            </>
          );
        },
        size: 280,
        enableSorting: false,
      },
      {
        id: 'status',
        accessorFn: (row) => drafts[row.id]?.status ?? 'PRESENT',
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) => (
          <Select
            value={drafts[row.original.id]?.status ?? 'PRESENT'}
            disabled={readOnly}
            onValueChange={(value) =>
              updateStatus(row.original.id, value as AttendanceStatus)
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
        ),
        size: 180,
        enableSorting: false,
      },
    ],
    [drafts, readOnly],
  );

  const table = useReactTable({
    data: studentRows,
    columns,
    getRowId: (row) => row.id,
    state: {
      columnOrder,
      pagination: { pageIndex: 0, pageSize: Math.max(studentRows.length, 8) },
    },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!classId) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('attendance.assignClassBeforeMarks')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <AttendanceDataGrid
        table={table}
        recordCount={studentRows.length}
        isLoading={rosterQuery.isLoading}
        isError={rosterQuery.isError}
        error={rosterQuery.error}
        emptyMessage={t('attendance.emptyRoster')}
        paginate={false}
      />

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={notifyGuardians}
              onCheckedChange={(checked) =>
                setNotifyGuardians(checked === true)
              }
            />
            {t('attendance.notifyGuardians')}
          </label>
          <Button
            type="button"
            disabled={saveAttendanceEntry.isPending || studentRows.length === 0}
            onClick={() => void handleSave()}
          >
            {saveAttendanceEntry.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              t('attendance.saveAttendance')
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
