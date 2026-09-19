-- Break AttendanceSession <-> AttendanceRecord SELECT RLS cycle (infinite recursion).
-- Cross-table checks run in SECURITY DEFINER helpers so policies do not re-enter each other.

CREATE OR REPLACE FUNCTION public.acadia_attendance_record_exists_for_student(
  p_tenant_id text,
  p_session_id text,
  p_student_profile_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_tenant_id = public.acadia_current_tenant_id()
    AND p_student_profile_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public."AttendanceRecord" r
      WHERE r."tenantId" = p_tenant_id
        AND r."attendanceSessionId" = p_session_id
        AND r."studentProfileId" = p_student_profile_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_attendance_record_exists_for_student(text, text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_attendance_record_exists_for_guardian(
  p_tenant_id text,
  p_session_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_tenant_id = public.acadia_current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public."AttendanceRecord" r
      WHERE r."tenantId" = p_tenant_id
        AND r."attendanceSessionId" = p_session_id
        AND public.acadia_is_linked_guardian_of(r."studentProfileId")
    );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_attendance_record_exists_for_guardian(text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_teacher_can_read_attendance_session(
  p_tenant_id text,
  p_session_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_tenant_id = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
    AND EXISTS (
      SELECT 1
      FROM public."AttendanceSession" s
      WHERE s.id = p_session_id
        AND s."tenantId" = p_tenant_id
        AND (
          s."classId" IS NULL
          OR public.acadia_teacher_assigned_to_class(s."classId", s."academicYearId")
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_teacher_can_read_attendance_session(text, text)
  TO authenticated;

DROP POLICY IF EXISTS "AttendanceSession_select_scoped" ON public."AttendanceSession";
CREATE POLICY "AttendanceSession_select_scoped"
  ON public."AttendanceSession"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_registry_admin()
      OR (
        public.acadia_is_staff_or_teacher()
        AND (
          "classId" IS NULL
          OR public.acadia_teacher_assigned_to_class("classId", "academicYearId")
        )
      )
      OR (
        public.acadia_current_student_profile_id() IS NOT NULL
        AND public.acadia_attendance_record_exists_for_student(
          "tenantId",
          id,
          public.acadia_current_student_profile_id()
        )
      )
      OR public.acadia_attendance_record_exists_for_guardian("tenantId", id)
    )
  );

DROP POLICY IF EXISTS "AttendanceRecord_select_scoped" ON public."AttendanceRecord";
CREATE POLICY "AttendanceRecord_select_scoped"
  ON public."AttendanceRecord"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_registry_admin()
      OR public.acadia_teacher_can_read_attendance_session("tenantId", "attendanceSessionId")
      OR "studentProfileId" = public.acadia_current_student_profile_id()
      OR public.acadia_is_linked_guardian_of("studentProfileId")
    )
  );
