-- Role-aware SELECT for student registry tables.
-- Admins/registrar/bursar/FD: tenant-wide.
-- Teachers/staff: assigned classes (subject + class-master) and class.staffProfileId.
-- Guardians/parents: GuardianStudentLink children.
-- Students: own StudentProfile only.

CREATE OR REPLACE FUNCTION public.acadia_is_registry_admin()
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

GRANT EXECUTE ON FUNCTION public.acadia_is_registry_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_is_linked_guardian_of(p_student_profile_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."GuardianStudentLink" g
    WHERE g."tenantId" = public.acadia_current_tenant_id()
      AND g."studentProfileId" = p_student_profile_id
      AND g."guardianUserId" = (auth.uid())::text
      AND g."consentRevokedAt" IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_is_linked_guardian_of(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_teacher_assigned_to_class(
  p_class_id text,
  p_academic_year_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_class_id IS NOT NULL
    AND public.acadia_current_staff_profile_id() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public."StaffClassSubjectAssignment" a
        WHERE a."tenantId" = public.acadia_current_tenant_id()
          AND a."classId" = p_class_id
          AND a."academicYearId" = p_academic_year_id
          AND a."staffProfileId" = public.acadia_current_staff_profile_id()
      )
      OR EXISTS (
        SELECT 1
        FROM public."StaffClassAssignment" a
        WHERE a."tenantId" = public.acadia_current_tenant_id()
          AND a."classId" = p_class_id
          AND a."academicYearId" = p_academic_year_id
          AND a."staffProfileId" = public.acadia_current_staff_profile_id()
      )
      OR EXISTS (
        SELECT 1
        FROM public."Class" c
        WHERE c.id = p_class_id
          AND c."tenantId" = public.acadia_current_tenant_id()
          AND c."staffProfileId" = public.acadia_current_staff_profile_id()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_teacher_assigned_to_class(text, text) TO authenticated;

DROP POLICY IF EXISTS "StudentProfile_select_tenant" ON public."StudentProfile";
CREATE POLICY "StudentProfile_select_scoped"
  ON public."StudentProfile"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_registry_admin()
      OR id = public.acadia_current_student_profile_id()
      OR public.acadia_is_linked_guardian_of(id)
      OR EXISTS (
        SELECT 1
        FROM public."StudentEnrollment" e
        WHERE e."tenantId" = "StudentProfile"."tenantId"
          AND e."studentProfileId" = "StudentProfile".id
          AND public.acadia_teacher_assigned_to_class(e."classId", e."academicYearId")
      )
    )
  );

DROP POLICY IF EXISTS "StudentEnrollment_select_tenant" ON public."StudentEnrollment";
CREATE POLICY "StudentEnrollment_select_scoped"
  ON public."StudentEnrollment"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_registry_admin()
      OR "studentProfileId" = public.acadia_current_student_profile_id()
      OR public.acadia_is_linked_guardian_of("studentProfileId")
      OR public.acadia_teacher_assigned_to_class("classId", "academicYearId")
    )
  );
