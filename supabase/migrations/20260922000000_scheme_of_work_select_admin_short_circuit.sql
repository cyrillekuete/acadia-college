-- Short-circuit admin/registrar before EXISTS on SchemeOfWork.
-- INSERT … RETURNING previously failed SELECT RLS because
-- acadia_can_view_scheme_of_work only evaluated admin inside an EXISTS
-- that re-reads the in-flight row (often invisible during RETURNING).

CREATE OR REPLACE FUNCTION public.acadia_can_view_scheme_of_work(p_scheme_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.acadia_is_admin_or_registrar()
    OR EXISTS (
      SELECT 1
      FROM public."SchemeOfWork" s
      WHERE s.id = p_scheme_id
        AND s."tenantId" = public.acadia_current_tenant_id()
        AND s.status = 'PUBLISHED'
        AND (
          EXISTS (
            SELECT 1
            FROM public."StaffClassSubjectAssignment" a
            WHERE a."tenantId" = s."tenantId"
              AND a."subjectId" = s."subjectId"
              AND a."academicYearId" = s."academicYearId"
              AND a."staffProfileId" = public.acadia_current_staff_profile_id()
          )
          OR EXISTS (
            SELECT 1
            FROM public."Class" c
            WHERE c."tenantId" = s."tenantId"
              AND c."levelId" = s."levelId"
              AND public.acadia_teacher_assigned_to_class(c.id, s."academicYearId")
          )
          OR (
            public.acadia_is_student()
            AND EXISTS (
              SELECT 1
              FROM public."StudentEnrollment" e
              JOIN public."Class" c
                ON c.id = e."classId" AND c."tenantId" = e."tenantId"
              WHERE e."tenantId" = s."tenantId"
                AND e."studentProfileId" = public.acadia_current_student_profile_id()
                AND e."academicYearId" = s."academicYearId"
                AND e.status = 'ENROLLED'
                AND c."levelId" = s."levelId"
            )
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_can_view_scheme_of_work(text) TO authenticated;
