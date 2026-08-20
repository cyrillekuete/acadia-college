-- Atomic class migration for StudentProfile + StudentEnrollment.

CREATE OR REPLACE FUNCTION public.acadia_is_registry_writer()
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
    'bursar'
  );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_is_registry_writer() TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_migrate_student_class(
  p_tenant_id text,
  p_profile_id text,
  p_academic_year_id text,
  p_sub_system public."AcademicSubSystem",
  p_branch public."AcademicBranch",
  p_level_id text,
  p_class_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_enrollment_id text;
  v_previous_class_id text;
BEGIN
  IF NOT public.acadia_is_registry_writer() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  UPDATE public."StudentProfile"
  SET
    "subSystem" = p_sub_system,
    branch = p_branch,
    "currentLevelId" = p_level_id,
    "updatedAt" = v_now
  WHERE id = p_profile_id
    AND "tenantId" = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'student not found';
  END IF;

  SELECT id, "classId"
  INTO v_enrollment_id, v_previous_class_id
  FROM public."StudentEnrollment"
  WHERE "tenantId" = p_tenant_id
    AND "studentProfileId" = p_profile_id
    AND "academicYearId" = p_academic_year_id
    AND status = 'ENROLLED'
  FOR UPDATE;

  IF v_enrollment_id IS NULL THEN
    v_enrollment_id := 'enr-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    INSERT INTO public."StudentEnrollment" (
      id,
      "tenantId",
      "studentProfileId",
      "academicYearId",
      "subSystem",
      branch,
      "levelId",
      "classId",
      status,
      "createdAt",
      "updatedAt"
    ) VALUES (
      v_enrollment_id,
      p_tenant_id,
      p_profile_id,
      p_academic_year_id,
      p_sub_system,
      p_branch,
      p_level_id,
      p_class_id,
      'ENROLLED',
      v_now,
      v_now
    );
  ELSE
    UPDATE public."StudentEnrollment"
    SET
      "subSystem" = p_sub_system,
      branch = p_branch,
      "levelId" = p_level_id,
      "classId" = p_class_id,
      "updatedAt" = v_now
    WHERE id = v_enrollment_id
      AND "tenantId" = p_tenant_id;
  END IF;

  RETURN jsonb_build_object(
    'enrollmentId', v_enrollment_id,
    'previousClassId', v_previous_class_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_migrate_student_class(
  text, text, text, public."AcademicSubSystem", public."AcademicBranch", text, text
) TO authenticated;
