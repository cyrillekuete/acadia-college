-- Tighten StudentTermDiscipline read access and require roster membership on write.
-- Replaces the tenant-wide SELECT policy and adds an enrollment check on INSERT/UPDATE.

DROP POLICY IF EXISTS "StudentTermDiscipline_select_tenant" ON public."StudentTermDiscipline";
CREATE POLICY "StudentTermDiscipline_select_tenant"
  ON public."StudentTermDiscipline"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR lower(public.acadia_current_role_slug()) = 'bursar'
      OR "studentProfileId" = public.acadia_current_student_profile_id()
      OR EXISTS (
        SELECT 1
        FROM public."GuardianStudentLink" g
        WHERE g."tenantId" = "StudentTermDiscipline"."tenantId"
          AND g."studentProfileId" = "StudentTermDiscipline"."studentProfileId"
          AND g."guardianUserId" = (auth.uid())::text
          AND g."consentRevokedAt" IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "StudentTermDiscipline_insert_class_master" ON public."StudentTermDiscipline";
CREATE POLICY "StudentTermDiscipline_insert_class_master"
  ON public."StudentTermDiscipline"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_admin_or_registrar()
      OR EXISTS (
        SELECT 1
        FROM public."Class" c
        WHERE c.id = "StudentTermDiscipline"."classId"
          AND c."tenantId" = "StudentTermDiscipline"."tenantId"
          AND c."staffProfileId" = public.acadia_current_staff_profile_id()
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public."StudentEnrollment" e
      WHERE e."tenantId" = "StudentTermDiscipline"."tenantId"
        AND e."academicYearId" = "StudentTermDiscipline"."academicYearId"
        AND e."classId" = "StudentTermDiscipline"."classId"
        AND e."studentProfileId" = "StudentTermDiscipline"."studentProfileId"
        AND e.status = 'ENROLLED'
    )
  );

DROP POLICY IF EXISTS "StudentTermDiscipline_update_class_master" ON public."StudentTermDiscipline";
CREATE POLICY "StudentTermDiscipline_update_class_master"
  ON public."StudentTermDiscipline"
  FOR UPDATE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_admin_or_registrar()
      OR EXISTS (
        SELECT 1
        FROM public."Class" c
        WHERE c.id = "StudentTermDiscipline"."classId"
          AND c."tenantId" = "StudentTermDiscipline"."tenantId"
          AND c."staffProfileId" = public.acadia_current_staff_profile_id()
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_admin_or_registrar()
      OR EXISTS (
        SELECT 1
        FROM public."Class" c
        WHERE c.id = "StudentTermDiscipline"."classId"
          AND c."tenantId" = "StudentTermDiscipline"."tenantId"
          AND c."staffProfileId" = public.acadia_current_staff_profile_id()
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public."StudentEnrollment" e
      WHERE e."tenantId" = "StudentTermDiscipline"."tenantId"
        AND e."academicYearId" = "StudentTermDiscipline"."academicYearId"
        AND e."classId" = "StudentTermDiscipline"."classId"
        AND e."studentProfileId" = "StudentTermDiscipline"."studentProfileId"
        AND e.status = 'ENROLLED'
    )
  );
