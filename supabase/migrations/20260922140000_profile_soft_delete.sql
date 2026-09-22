-- Soft delete for staff and students, plus permanent purge of person-owned rows.

ALTER TABLE public."StaffProfile"
  ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

ALTER TABLE public."StudentProfile"
  ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

CREATE INDEX IF NOT EXISTS "StaffProfile_tenant_deletedAt_idx"
  ON public."StaffProfile" ("tenantId")
  WHERE "deletedAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "StudentProfile_tenant_deletedAt_idx"
  ON public."StudentProfile" ("tenantId")
  WHERE "deletedAt" IS NOT NULL;

ALTER TABLE public."TimetableSlot"
  ALTER COLUMN "staffProfileId" DROP NOT NULL;

-- Shared records keep their history when a login is removed.
-- Person-owned rows cascade. Profile links stay until the profile row is deleted.
DO $$
DECLARE
  r record;
  v_action text;
BEGIN
  FOR r IN
    SELECT
      ns.nspname AS schema_name,
      src.relname AS table_name,
      con.conname AS constraint_name,
      att.attname AS column_name,
      att.attnotnull AS not_null,
      con.confdeltype AS delete_action,
      cardinality(con.conkey) AS key_count
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = src.relnamespace
    JOIN pg_class dst ON dst.oid = con.confrelid
    JOIN pg_namespace dst_ns ON dst_ns.oid = dst.relnamespace
    JOIN pg_attribute att
      ON att.attrelid = src.oid
     AND att.attnum = con.conkey[1]
    WHERE con.contype = 'f'
      AND ns.nspname = 'public'
      AND dst_ns.nspname = 'public'
      AND dst.relname = 'User'
      AND cardinality(con.conkey) = 1
      AND con.confdeltype NOT IN ('c', 'n')
  LOOP
    IF r.table_name IN ('StaffProfile', 'StudentProfile') THEN
      CONTINUE;
    END IF;

    IF r.table_name IN (
      'Notification',
      'NotificationPreference',
      'MessageThreadMember',
      'WhatsAppOutbound',
      'SchoolAlertRecipient',
      'SchoolAlertGroupMember'
    ) THEN
      v_action := 'CASCADE';
    ELSE
      v_action := 'SET NULL';
      IF r.not_null THEN
        EXECUTE format(
          'ALTER TABLE %I.%I ALTER COLUMN %I DROP NOT NULL',
          r.schema_name,
          r.table_name,
          r.column_name
        );
      END IF;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      r.schema_name,
      r.table_name,
      r.constraint_name
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I (id) ON DELETE %s',
      r.schema_name,
      r.table_name,
      r.constraint_name,
      r.column_name,
      'User',
      v_action
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.acadia_delete_profile_login(
  p_user_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public."StaffProfile"
    WHERE "userId" = p_user_id
  ) OR EXISTS (
    SELECT 1
    FROM public."StudentProfile"
    WHERE "userId" = p_user_id
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public."User"
    WHERE id = p_user_id
      AND "isProtected" = true
  ) THEN
    RAISE EXCEPTION 'Protected accounts cannot be deleted.';
  END IF;

  UPDATE public.users
  SET created_by = NULL
  WHERE created_by = p_user_id;

  DELETE FROM public.user_profiles
  WHERE user_id = p_user_id;

  DELETE FROM public.users
  WHERE id = p_user_id;

  DELETE FROM public."User"
  WHERE id = p_user_id
    AND COALESCE("isProtected", false) = false;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.acadia_purge_student_profile(
  p_tenant_id text,
  p_profile_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_deleted_at timestamptz;
  v_protected boolean;
BEGIN
  SELECT sp."userId", sp."deletedAt", COALESCE(u."isProtected", false)
  INTO v_user_id, v_deleted_at, v_protected
  FROM public."StudentProfile" sp
  LEFT JOIN public."User" u ON u.id = sp."userId"
  WHERE sp.id = p_profile_id
    AND sp."tenantId" = p_tenant_id
  FOR UPDATE OF sp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile not found.';
  END IF;

  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'Student must be deleted before they can be removed permanently.';
  END IF;

  IF v_protected THEN
    RAISE EXCEPTION 'Protected accounts cannot be deleted.';
  END IF;

  UPDATE public."FinanceSale"
  SET "studentProfileId" = NULL, "updatedAt" = now()
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  UPDATE public."Transcript"
  SET "currentVersionId" = NULL, "updatedAt" = now()
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  DELETE FROM public."TranscriptVersion" v
  USING public."Transcript" t
  WHERE v."transcriptId" = t.id
    AND t."tenantId" = p_tenant_id
    AND t."studentProfileId" = p_profile_id;

  DELETE FROM public."TranscriptCopyRequest"
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  DELETE FROM public."Transcript"
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  DELETE FROM public."SubjectMark"
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  DELETE FROM public."CourseworkSubmission"
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  DELETE FROM public."AttendanceRecord"
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  DELETE FROM public."StudentTermDiscipline"
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  DELETE FROM public."StudentPromotionDecision"
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  DELETE FROM public."GuardianStudentLink"
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  DELETE FROM public."StudentScholarship" s
  USING public."StudentFeeAccount" a
  WHERE s."studentFeeAccountId" = a.id
    AND a."tenantId" = p_tenant_id
    AND a."studentProfileId" = p_profile_id;

  DELETE FROM public."StudentFeeInstallment" i
  USING public."StudentFeeAccount" a
  WHERE i."studentFeeAccountId" = a.id
    AND a."tenantId" = p_tenant_id
    AND a."studentProfileId" = p_profile_id;

  UPDATE public."StudentFeeAccount"
  SET "studentEnrollmentId" = NULL, "updatedAt" = now()
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  DELETE FROM public."StudentFeeAccount"
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  DELETE FROM public."StudentEnrollment"
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id;

  UPDATE public."SchoolAlertRecipient"
  SET "studentProfileIds" = array_remove("studentProfileIds", p_profile_id)
  WHERE "tenantId" = p_tenant_id
    AND p_profile_id = ANY("studentProfileIds");

  DELETE FROM public."StudentProfile"
  WHERE id = p_profile_id
    AND "tenantId" = p_tenant_id
    AND "deletedAt" IS NOT NULL;

  IF public.acadia_delete_profile_login(v_user_id) THEN
    RETURN jsonb_build_object('userId', v_user_id);
  END IF;

  RETURN jsonb_build_object('userId', NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.acadia_purge_staff_profile(
  p_tenant_id text,
  p_profile_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_deleted_at timestamptz;
  v_protected boolean;
BEGIN
  SELECT sp."userId", sp."deletedAt", COALESCE(u."isProtected", false)
  INTO v_user_id, v_deleted_at, v_protected
  FROM public."StaffProfile" sp
  LEFT JOIN public."User" u ON u.id = sp."userId"
  WHERE sp.id = p_profile_id
    AND sp."tenantId" = p_tenant_id
  FOR UPDATE OF sp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff profile not found.';
  END IF;

  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'Staff member must be deleted before they can be removed permanently.';
  END IF;

  IF v_protected THEN
    RAISE EXCEPTION 'Protected accounts cannot be deleted.';
  END IF;

  UPDATE public."Class"
  SET "staffProfileId" = NULL, "updatedAt" = now()
  WHERE "tenantId" = p_tenant_id
    AND "staffProfileId" = p_profile_id;

  UPDATE public."TimetableSlot"
  SET "staffProfileId" = NULL, "updatedAt" = now()
  WHERE "tenantId" = p_tenant_id
    AND "staffProfileId" = p_profile_id;

  UPDATE public."SchemeOfWorkTopicProgress"
  SET "completedByStaffProfileId" = NULL
  WHERE "tenantId" = p_tenant_id
    AND "completedByStaffProfileId" = p_profile_id;

  UPDATE public."StudentTermDiscipline"
  SET "recordedByStaffProfileId" = NULL, "updatedAt" = now()
  WHERE "tenantId" = p_tenant_id
    AND "recordedByStaffProfileId" = p_profile_id;

  DELETE FROM public."SubjectAssignmentOffering" o
  USING public."SubjectAssignment" a
  WHERE o."subjectAssignmentId" = a.id
    AND o."tenantId" = p_tenant_id
    AND a."tenantId" = p_tenant_id
    AND a."staffProfileId" = p_profile_id;

  DELETE FROM public."SubjectAssignment"
  WHERE "tenantId" = p_tenant_id
    AND "staffProfileId" = p_profile_id;

  DELETE FROM public."StaffClassSubjectAssignment"
  WHERE "tenantId" = p_tenant_id
    AND "staffProfileId" = p_profile_id;

  DELETE FROM public."StaffClassAssignment"
  WHERE "tenantId" = p_tenant_id
    AND "staffProfileId" = p_profile_id;

  DELETE FROM public."StaffProfile"
  WHERE id = p_profile_id
    AND "tenantId" = p_tenant_id
    AND "deletedAt" IS NOT NULL;

  IF public.acadia_delete_profile_login(v_user_id) THEN
    RETURN jsonb_build_object('userId', v_user_id);
  END IF;

  RETURN jsonb_build_object('userId', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.acadia_delete_profile_login(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.acadia_purge_student_profile(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.acadia_purge_staff_profile(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.acadia_delete_profile_login(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.acadia_purge_student_profile(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.acadia_purge_staff_profile(text, text) TO service_role;
