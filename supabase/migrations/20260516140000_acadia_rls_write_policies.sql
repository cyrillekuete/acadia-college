-- Role-aware write policies for tenant-scoped school data

CREATE OR REPLACE FUNCTION public.acadia_current_role_slug()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.slug
  FROM public."User" u
  JOIN public."UserRole" r ON r.id = u."roleId"
  WHERE u.id = auth.uid()::text
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_current_role_slug() TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_is_admin_or_registrar()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(public.acadia_current_role_slug()) IN (
    'admin',
    'super-admin',
    'financial-director',
    'registrar'
  );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_is_admin_or_registrar() TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_is_staff_or_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(public.acadia_current_role_slug()) IN (
    'admin',
    'super-admin',
    'financial-director',
    'registrar',
    'lecturer',
    'staff',
    'teacher'
  );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_is_staff_or_teacher() TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_is_student()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(public.acadia_current_role_slug()) = 'student';
$$;

GRANT EXECUTE ON FUNCTION public.acadia_is_student() TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_current_student_profile_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.id
  FROM public."StudentProfile" sp
  WHERE sp."userId" = auth.uid()::text
    AND sp."tenantId" = public.acadia_current_tenant_id()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_current_student_profile_id() TO authenticated;

-- Tenant: admins/registrars may update institution settings (e.g. logoStorageKey)
DROP POLICY IF EXISTS "tenant_update_admin" ON public."Tenant";
CREATE POLICY "tenant_update_admin"
  ON public."Tenant"
  FOR UPDATE
  TO authenticated
  USING (id = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())
  WITH CHECK (id = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar());

-- Macro: tenant-scoped registry tables (admin/registrar write)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'StudentProfile',
    'StaffProfile',
    'Course',
    'AcademicYear',
    'Semester',
    'Department',
    'Level',
    'Specialty',
    'Room',
    'EnrollmentApplication',
    'StudentEnrollment',
    'StudentFeeAccount',
    'StudentScholarship',
    'Transcript',
    'TranscriptCopyRequest',
    'TenantApiKey',
    'TimetableSlot'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select_tenant', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ("tenantId" = public.acadia_current_tenant_id())',
      tbl || '_select_tenant',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_insert_admin', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
      tbl || '_insert_admin',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_update_admin', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar()) WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
      tbl || '_update_admin',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_delete_admin', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
      tbl || '_delete_admin',
      tbl
    );
  END LOOP;
END $$;

-- Operations tables: staff+ may write; all tenant members may read
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'AttendanceSession',
    'AttendanceRecord',
    'CourseMark',
    'CourseworkTask',
    'ExamSession'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select_tenant', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ("tenantId" = public.acadia_current_tenant_id())',
      tbl || '_select_tenant',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_insert_staff', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher())',
      tbl || '_insert_staff',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_update_staff', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher()) WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher())',
      tbl || '_update_staff',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_delete_staff', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher())',
      tbl || '_delete_staff',
      tbl
    );
  END LOOP;
END $$;

-- Coursework submissions: students manage own rows; staff+ manage all in tenant
ALTER TABLE public."CourseworkSubmission" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coursework_submission_select_tenant" ON public."CourseworkSubmission";
CREATE POLICY "coursework_submission_select_tenant"
  ON public."CourseworkSubmission"
  FOR SELECT
  TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "coursework_submission_insert_student" ON public."CourseworkSubmission";
CREATE POLICY "coursework_submission_insert_student"
  ON public."CourseworkSubmission"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR (
        public.acadia_is_student()
        AND "studentProfileId" = public.acadia_current_student_profile_id()
      )
    )
  );

DROP POLICY IF EXISTS "coursework_submission_update_student" ON public."CourseworkSubmission";
CREATE POLICY "coursework_submission_update_student"
  ON public."CourseworkSubmission"
  FOR UPDATE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR (
        public.acadia_is_student()
        AND "studentProfileId" = public.acadia_current_student_profile_id()
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR (
        public.acadia_is_student()
        AND "studentProfileId" = public.acadia_current_student_profile_id()
      )
    )
  );

DROP POLICY IF EXISTS "coursework_submission_delete_staff" ON public."CourseworkSubmission";
CREATE POLICY "coursework_submission_delete_staff"
  ON public."CourseworkSubmission"
  FOR DELETE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  );

-- Messaging & notifications: tenant read; staff+ write (simplified)
ALTER TABLE public."Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotificationPreference" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_select_tenant" ON public."Message";
CREATE POLICY "message_select_tenant"
  ON public."Message"
  FOR SELECT
  TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "message_write_staff" ON public."Message";
CREATE POLICY "message_write_staff"
  ON public."Message"
  FOR ALL
  TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher())
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher());

DROP POLICY IF EXISTS "notification_select_own" ON public."Notification";
CREATE POLICY "notification_select_own"
  ON public."Notification"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND "userId" = auth.uid()::text
  );

DROP POLICY IF EXISTS "notification_pref_select_own" ON public."NotificationPreference";
CREATE POLICY "notification_pref_select_own"
  ON public."NotificationPreference"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND "userId" = auth.uid()::text
  );

DROP POLICY IF EXISTS "notification_pref_write_own" ON public."NotificationPreference";
CREATE POLICY "notification_pref_write_own"
  ON public."NotificationPreference"
  FOR ALL
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND "userId" = auth.uid()::text
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND "userId" = auth.uid()::text
  );
