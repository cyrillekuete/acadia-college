-- Academic Structure edge cases: year lifecycle, atomic rollover, uniqueness.

-- Dedupe extra current years (keep newest) before unique index.
UPDATE public."AcademicYear" ay
SET "isCurrent" = false, "updatedAt" = now()
WHERE ay.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "tenantId"
        ORDER BY "updatedAt" DESC, "createdAt" DESC
      ) AS rn
    FROM public."AcademicYear"
    WHERE "isCurrent" = true
  ) ranked
  WHERE rn > 1
);

ALTER TABLE public."AcademicYear"
  ADD COLUMN IF NOT EXISTS "rolloverCompletedAt" timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS "AcademicYear_tenant_current_uidx"
  ON public."AcademicYear" ("tenantId")
  WHERE "isCurrent" = true;

ALTER TABLE public."Class"
  ADD COLUMN IF NOT EXISTS "isDefaultPromotionTarget" boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Class_tenant_level_stream_default_uidx"
  ON public."Class" ("tenantId", "levelId", "subSystem", "branch")
  WHERE "isDefaultPromotionTarget" = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public."AcademicSequence"
    GROUP BY "tenantId", "termId", "numberInTerm"
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "AcademicSequence_tenant_term_numberInTerm_uidx"
      ON public."AcademicSequence" ("tenantId", "termId", "numberInTerm");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public."AcademicCalendarMilestone"
    WHERE "termId" IS NULL
    GROUP BY "tenantId", "academicYearId", "kind"
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "AcademicCalendarMilestone_year_kind_noterm_uidx"
      ON public."AcademicCalendarMilestone" ("tenantId", "academicYearId", "kind")
      WHERE "termId" IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public."AcademicCalendarMilestone"
    WHERE "termId" IS NOT NULL
    GROUP BY "tenantId", "academicYearId", "kind", "termId"
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "AcademicCalendarMilestone_year_kind_term_uidx"
      ON public."AcademicCalendarMilestone" ("tenantId", "academicYearId", "kind", "termId")
      WHERE "termId" IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public."StudentTermDiscipline"
  DROP CONSTRAINT IF EXISTS "StudentTermDiscipline_termNumber_check";

ALTER TABLE public."StudentTermDiscipline"
  ADD CONSTRAINT "StudentTermDiscipline_termNumber_check"
  CHECK ("termNumber" >= 1 AND "termNumber" <= 12);

CREATE OR REPLACE FUNCTION public.acadia_set_current_academic_year(
  p_tenant_id text,
  p_academic_year_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.acadia_is_registry_writer() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  UPDATE public."AcademicYear"
  SET "isCurrent" = false, "updatedAt" = now()
  WHERE "tenantId" = p_tenant_id
    AND "isCurrent" = true
    AND id IS DISTINCT FROM p_academic_year_id;

  UPDATE public."AcademicYear"
  SET "isCurrent" = true, "isActive" = true, "updatedAt" = now()
  WHERE id = p_academic_year_id
    AND "tenantId" = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'academic year not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_set_current_academic_year(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_execute_year_rollover(
  p_tenant_id text,
  p_source_year_id text,
  p_target_year_id text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_item jsonb;
  v_student_id text;
  v_final_action text;
  v_target_level_id text;
  v_target_class_id text;
  v_sub_system public."AcademicSubSystem";
  v_branch public."AcademicBranch";
  v_create_enrollment boolean;
  v_mark_alumni boolean;
  v_withdraw_source boolean;
  v_close_source boolean;
  v_enrollment_id text;
  v_applied int := 0;
BEGIN
  IF NOT public.acadia_is_registry_writer() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  IF p_source_year_id IS NULL OR p_target_year_id IS NULL THEN
    RAISE EXCEPTION 'source and target academic years are required';
  END IF;

  IF p_source_year_id = p_target_year_id THEN
    RAISE EXCEPTION 'source and target academic years must differ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public."AcademicYear"
    WHERE id = p_source_year_id
      AND "tenantId" = p_tenant_id
      AND "rolloverCompletedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Promotion for this year is locked after rollover was applied.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'rollover items must be an array';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_student_id := v_item->>'studentProfileId';
    v_final_action := v_item->>'finalAction';
    v_target_level_id := nullif(v_item->>'targetLevelId', '');
    v_target_class_id := nullif(v_item->>'targetClassId', '');
    v_sub_system := (v_item->>'subSystem')::public."AcademicSubSystem";
    v_branch := (v_item->>'branch')::public."AcademicBranch";
    v_create_enrollment := coalesce((v_item->>'createEnrollment')::boolean, false);
    v_mark_alumni := coalesce((v_item->>'markAlumni')::boolean, false);
    v_withdraw_source := coalesce((v_item->>'withdrawSource')::boolean, false);
    v_close_source := coalesce((v_item->>'closeSourceEnrollment')::boolean, false);

    IF v_student_id IS NULL OR v_final_action IS NULL THEN
      RAISE EXCEPTION 'invalid rollover item';
    END IF;

    IF v_create_enrollment AND v_target_class_id IS NULL THEN
      RAISE EXCEPTION 'Unresolved target class for student %', v_student_id;
    END IF;

    IF v_mark_alumni THEN
      UPDATE public."StudentProfile"
      SET
        "alumniSince" = v_now,
        "isActive" = false,
        "currentLevelId" = coalesce(v_target_level_id, "currentLevelId"),
        "updatedAt" = v_now
      WHERE id = v_student_id
        AND "tenantId" = p_tenant_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'student not found: %', v_student_id;
      END IF;
    END IF;

    IF v_withdraw_source THEN
      UPDATE public."StudentProfile"
      SET "isActive" = false, "updatedAt" = v_now
      WHERE id = v_student_id
        AND "tenantId" = p_tenant_id;
    END IF;

    IF v_create_enrollment THEN
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
        v_student_id,
        p_target_year_id,
        v_sub_system,
        v_branch,
        v_target_level_id,
        v_target_class_id,
        'ENROLLED',
        v_now,
        v_now
      );

      UPDATE public."StudentProfile"
      SET
        "subSystem" = v_sub_system,
        branch = v_branch,
        "currentLevelId" = v_target_level_id,
        "updatedAt" = v_now
      WHERE id = v_student_id
        AND "tenantId" = p_tenant_id;
    END IF;

    IF v_close_source OR v_withdraw_source THEN
      UPDATE public."StudentEnrollment"
      SET status = 'WITHDRAWN', "updatedAt" = v_now
      WHERE "tenantId" = p_tenant_id
        AND "studentProfileId" = v_student_id
        AND "academicYearId" = p_source_year_id
        AND status = 'ENROLLED';
    END IF;

    UPDATE public."StudentPromotionDecision"
    SET "appliedAt" = v_now, "updatedAt" = v_now
    WHERE "tenantId" = p_tenant_id
      AND "studentProfileId" = v_student_id
      AND "academicYearId" = p_source_year_id;

    v_applied := v_applied + 1;
  END LOOP;

  PERFORM public.acadia_set_current_academic_year(p_tenant_id, p_target_year_id);

  UPDATE public."AcademicYear"
  SET
    "isCurrent" = false,
    "isActive" = false,
    "rolloverCompletedAt" = v_now,
    "updatedAt" = v_now
  WHERE id = p_source_year_id
    AND "tenantId" = p_tenant_id;

  RETURN jsonb_build_object(
    'applied', v_applied,
    'targetYearId', p_target_year_id,
    'sourceYearId', p_source_year_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_execute_year_rollover(text, text, text, jsonb) TO authenticated;
