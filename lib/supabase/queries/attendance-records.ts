import type { SupabaseClient } from '@supabase/supabase-js';
import { chunkIds, type AttendanceStatus } from '@/lib/acadia/attendance';

export type AttendanceRecordFetchRow = {
  studentProfileId: string;
  status: AttendanceStatus;
  attendanceSessionId?: string;
  StudentProfile?: unknown;
};

const RECORD_SELECT = `
  studentProfileId,
  status,
  attendanceSessionId,
  StudentProfile!AttendanceRecord_studentProfileId_tenantId_fkey (
    registrationNumber,
    User!StudentProfile_userId_tenantId_fkey ( name )
  )
`;

/** Fetch attendance records for many sessions without oversized `.in()` payloads. */
export async function fetchAttendanceRecordsForSessions(
  supabase: SupabaseClient,
  tenantId: string,
  sessionIds: string[],
): Promise<AttendanceRecordFetchRow[]> {
  if (sessionIds.length === 0) {
    return [];
  }

  const rows: AttendanceRecordFetchRow[] = [];
  for (const chunk of chunkIds(sessionIds)) {
    const { data, error } = await supabase
      .from('AttendanceRecord')
      .select(RECORD_SELECT)
      .eq('tenantId', tenantId)
      .in('attendanceSessionId', chunk);
    if (error) {
      throw error;
    }
    for (const row of data ?? []) {
      rows.push({
        studentProfileId: row.studentProfileId as string,
        status: row.status as AttendanceStatus,
        attendanceSessionId: row.attendanceSessionId as string | undefined,
        StudentProfile: row.StudentProfile,
      });
    }
  }
  return rows;
}
