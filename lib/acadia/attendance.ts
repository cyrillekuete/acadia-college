import type {
  AttendanceRecordEntryValues,
  AttendanceSessionFormValues,
} from '@/lib/acadia/attendance-schemas';

export const ATTENDANCE_STATUSES = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  EXCUSED: 'Excused',
};

export function attendanceStatusLabel(status: string): string {
  return STATUS_LABELS[status as AttendanceStatus] ?? status;
}

export const ATTENDANCE_NOTIFICATION_EVENT = 'attendance.absence';

export type AttendanceStatusCounts = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
};

export function countAttendanceStatuses(
  statuses: AttendanceStatus[],
): AttendanceStatusCounts {
  const counts: AttendanceStatusCounts = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total: statuses.length,
  };
  for (const status of statuses) {
    if (status === 'PRESENT') {
      counts.present += 1;
    } else if (status === 'ABSENT') {
      counts.absent += 1;
    } else if (status === 'LATE') {
      counts.late += 1;
    } else if (status === 'EXCUSED') {
      counts.excused += 1;
    }
  }
  return counts;
}

/** Present + late over sessions that count (excludes excused from denominator). */
export function computeAttendancePercentage(
  statuses: AttendanceStatus[],
): number | null {
  const countable = statuses.filter((s) => s !== 'EXCUSED');
  if (countable.length === 0) {
    return null;
  }
  const attended = countable.filter(
    (s) => s === 'PRESENT' || s === 'LATE',
  ).length;
  return Math.round((attended / countable.length) * 1000) / 10;
}

export function formatAttendancePercentage(
  value: number | null | undefined,
): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}

export type StudentAttendanceSummary = {
  studentProfileId: string;
  percentage: number | null;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sessions: number;
};

export function summarizeStudentAttendance(
  records: { studentProfileId: string; status: AttendanceStatus }[],
): StudentAttendanceSummary[] {
  const byStudent = new Map<string, AttendanceStatus[]>();
  for (const row of records) {
    const list = byStudent.get(row.studentProfileId) ?? [];
    list.push(row.status);
    byStudent.set(row.studentProfileId, list);
  }

  return Array.from(byStudent.entries()).map(([studentProfileId, statuses]) => {
    const counts = countAttendanceStatuses(statuses);
    return {
      studentProfileId,
      percentage: computeAttendancePercentage(statuses),
      present: counts.present,
      absent: counts.absent,
      late: counts.late,
      excused: counts.excused,
      sessions: counts.total,
    };
  });
}

export type AttendancePatternFlag =
  | 'high_absence'
  | 'frequent_late'
  | 'low_attendance';

export type AttendancePatternInsight = {
  studentProfileId: string;
  flags: AttendancePatternFlag[];
  percentage: number | null;
  absent: number;
  late: number;
};

const HIGH_ABSENCE_THRESHOLD = 3;
const FREQUENT_LATE_THRESHOLD = 3;
const LOW_ATTENDANCE_PERCENT = 75;

export function detectAttendancePatterns(
  summaries: StudentAttendanceSummary[],
): AttendancePatternInsight[] {
  return summaries
    .map((summary) => {
      const flags: AttendancePatternFlag[] = [];
      if (summary.absent >= HIGH_ABSENCE_THRESHOLD) {
        flags.push('high_absence');
      }
      if (summary.late >= FREQUENT_LATE_THRESHOLD) {
        flags.push('frequent_late');
      }
      if (
        summary.percentage != null &&
        summary.sessions >= 3 &&
        summary.percentage < LOW_ATTENDANCE_PERCENT
      ) {
        flags.push('low_attendance');
      }
      return {
        studentProfileId: summary.studentProfileId,
        flags,
        percentage: summary.percentage,
        absent: summary.absent,
        late: summary.late,
      };
    })
    .filter((row) => row.flags.length > 0)
    .sort((a, b) => (a.percentage ?? 100) - (b.percentage ?? 100));
}

export function patternFlagLabel(flag: AttendancePatternFlag): string {
  switch (flag) {
    case 'high_absence':
      return 'High absences';
    case 'frequent_late':
      return 'Frequent lateness';
    case 'low_attendance':
      return 'Low attendance rate';
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

export function buildAttendanceSessionRow(
  tenantId: string,
  id: string,
  values: AttendanceSessionFormValues,
  createdByUserId: string | null,
  now: string,
) {
  return {
    id,
    tenantId,
    academicYearId: values.academicYearId,
    subjectId: values.subjectId,
    timetableSlotId: values.timetableSlotId?.trim()
      ? values.timetableSlotId
      : null,
    sessionDate: values.sessionDate,
    label: values.label?.trim() ? values.label : null,
    createdByUserId,
    updatedAt: now,
  };
}

export function buildAttendanceRecordRow(
  tenantId: string,
  id: string,
  attendanceSessionId: string,
  values: AttendanceRecordEntryValues,
  now: string,
) {
  return {
    id,
    tenantId,
    attendanceSessionId,
    studentProfileId: values.studentProfileId,
    status: values.status,
    updatedAt: now,
  };
}

export function shouldNotifyGuardian(status: AttendanceStatus): boolean {
  return status === 'ABSENT' || status === 'LATE';
}
