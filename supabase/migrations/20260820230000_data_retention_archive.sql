-- Safe data-retention archive: never touch current-year enrollments;
-- only withdraw ENROLLED rows whose academic year ended before the cutoff;
-- only deactivate profiles with no current-year enrollment.

CREATE OR REPLACE FUNCTION public.acadia_run_retention_archive(
  p_dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant text;
  v_inactive_years integer := 3;
  v_enrollment_years integer := 10;
  v_marks_years integer := 7;
  v_now timestamptz := clock_timestamp();
  v_inactive_cutoff timestamptz;
  v_enrollment_cutoff date;
  v_profile_ids text[] := '{}';
  v_enrollment_ids text[] := '{}';
BEGIN
  IF NOT public.acadia_is_admin_or_registrar() THEN
    RAISE EXCEPTION 'Only administrators can run data retention.';
  END IF;

  v_tenant := public.acadia_current_tenant_id();
  IF v_tenant IS NULL OR btrim(v_tenant) = '' THEN
    RAISE EXCEPTION 'Tenant context is required.';
  END IF;

  SELECT
    COALESCE("archiveInactiveAfterYears", 3),
    COALESCE("enrollmentRetentionYears", 10),
    COALESCE("marksRetentionYears", 7)
  INTO v_inactive_years, v_enrollment_years, v_marks_years
  FROM public."TenantDataRetentionPolicy"
  WHERE "tenantId" = v_tenant;
  IF NOT FOUND THEN
    v_inactive_years := 3;
    v_enrollment_years := 10;
    v_marks_years := 7;
  END IF;

  v_inactive_cutoff := v_now - make_interval(years => v_inactive_years);
  v_enrollment_cutoff := (v_now::date - make_interval(years => v_enrollment_years))::date;

  SELECT COALESCE(array_agg(p.id), '{}')
  INTO v_profile_ids
  FROM public."StudentProfile" p
  WHERE p."tenantId" = v_tenant
    AND p."isActive" = true
    AND p."updatedAt" < v_inactive_cutoff
    AND NOT EXISTS (
      SELECT 1
      FROM public."StudentEnrollment" e
      JOIN public."AcademicYear" y
        ON y.id = e."academicYearId"
       AND y."tenantId" = e."tenantId"
      WHERE e."studentProfileId" = p.id
        AND e."tenantId" = p."tenantId"
        AND e.status = 'ENROLLED'
        AND y."isCurrent" = true
    );

  SELECT COALESCE(array_agg(e.id), '{}')
  INTO v_enrollment_ids
  FROM public."StudentEnrollment" e
  JOIN public."AcademicYear" y
    ON y.id = e."academicYearId"
   AND y."tenantId" = e."tenantId"
  WHERE e."tenantId" = v_tenant
    AND e.status = 'ENROLLED'
    AND y."isCurrent" = false
    AND y."endsOn" < v_enrollment_cutoff;

  IF NOT p_dry_run THEN
    IF cardinality(v_profile_ids) > 0 THEN
      UPDATE public."StudentProfile"
      SET "isActive" = false, "updatedAt" = v_now
      WHERE "tenantId" = v_tenant
        AND id = ANY (v_profile_ids);
    END IF;

    IF cardinality(v_enrollment_ids) > 0 THEN
      UPDATE public."StudentEnrollment"
      SET status = 'WITHDRAWN', "updatedAt" = v_now
      WHERE "tenantId" = v_tenant
        AND id = ANY (v_enrollment_ids);
    END IF;

    INSERT INTO public."TenantDataRetentionPolicy" (
      "tenantId",
      "marksRetentionYears",
      "enrollmentRetentionYears",
      "archiveInactiveAfterYears",
      "lastArchivalRunAt",
      "updatedAt"
    )
    VALUES (
      v_tenant,
      v_marks_years,
      v_enrollment_years,
      v_inactive_years,
      v_now,
      v_now
    )
    ON CONFLICT ("tenantId") DO UPDATE
    SET "lastArchivalRunAt" = EXCLUDED."lastArchivalRunAt",
        "updatedAt" = EXCLUDED."updatedAt";
  END IF;

  RETURN jsonb_build_object(
    'deactivated', cardinality(v_profile_ids),
    'archivedEnrollments', cardinality(v_enrollment_ids),
    'dryRun', p_dry_run
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_run_retention_archive(boolean) TO authenticated;
