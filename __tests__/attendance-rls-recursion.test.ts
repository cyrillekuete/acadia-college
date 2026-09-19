import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readMigration(name: string): string {
  return readFileSync(
    join(process.cwd(), 'supabase', 'migrations', name),
    'utf8',
  );
}

describe('attendance SELECT RLS recursion fix', () => {
  const previous = readMigration('20260820210100_attendance_edge_cases.sql');
  const fix = readMigration('20260919120000_attendance_rls_recursion_fix.sql');

  it('previously cycled AttendanceSession and AttendanceRecord SELECT policies', () => {
    expect(previous).toMatch(
      /FROM public\."AttendanceRecord" r[\s\S]*attendanceSessionId/,
    );
    expect(previous).toMatch(
      /FROM public\."AttendanceSession" s[\s\S]*AttendanceRecord/,
    );
  });

  it('breaks the cycle with tenant-scoped SECURITY DEFINER helpers', () => {
    expect(fix).toMatch(/acadia_attendance_record_exists_for_student/);
    expect(fix).toMatch(/acadia_attendance_record_exists_for_guardian/);
    expect(fix).toMatch(/acadia_teacher_can_read_attendance_session/);
    expect(fix).toMatch(/SECURITY DEFINER/);
    expect(fix).toMatch(/acadia_current_tenant_id\(\)/);

    const sessionPolicy = fix.slice(
      fix.indexOf('CREATE POLICY "AttendanceSession_select_scoped"'),
    );
    expect(sessionPolicy).toMatch(/acadia_attendance_record_exists_for_student/);
    expect(sessionPolicy).not.toMatch(/FROM public\."AttendanceRecord"/);

    const recordPolicy = fix.slice(
      fix.indexOf('CREATE POLICY "AttendanceRecord_select_scoped"'),
    );
    expect(recordPolicy).toMatch(/acadia_teacher_can_read_attendance_session/);
    expect(recordPolicy).not.toMatch(/FROM public\."AttendanceSession"/);
  });
});
