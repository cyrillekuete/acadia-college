-- Coursework + scheme-of-work edge cases: RLS, uniqueness, and progress guards.

-- ---------------------------------------------------------------------------
-- CourseworkSubmission: one row per student per task
-- ---------------------------------------------------------------------------
DELETE FROM public."CourseworkSubmission" a
USING public."CourseworkSubmission" b
WHERE a."tenantId" = b."tenantId"
  AND a."taskId" = b."taskId"
  AND a."studentProfileId" = b."studentProfileId"
  AND a.id <> b.id
  AND (
    a."updatedAt" < b."updatedAt"
    OR (a."updatedAt" = b."updatedAt" AND a.id < b.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS "CourseworkSubmission_tenant_task_student_uidx"
  ON public."CourseworkSubmission" ("tenantId", "taskId", "studentProfileId");

-- ---------------------------------------------------------------------------
-- CourseworkTask SELECT: staff see all; students see published only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "CourseworkTask_select_tenant" ON public."CourseworkTask";
CREATE POLICY "CourseworkTask_select_tenant" ON public."CourseworkTask"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR public.acadia_is_admin_or_registrar()
      OR (
        public.acadia_is_student()
        AND "isPublished" = true
      )
    )
  );

-- ---------------------------------------------------------------------------
-- CourseworkSubmission SELECT: staff all; students own rows only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coursework_submission_select_tenant" ON public."CourseworkSubmission";
CREATE POLICY "coursework_submission_select_tenant" ON public."CourseworkSubmission"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR public.acadia_is_admin_or_registrar()
      OR (
        public.acadia_is_student()
        AND "studentProfileId" = public.acadia_current_student_profile_id()
      )
    )
  );

-- Split update: staff full; students own rows (grading columns guarded by trigger)
DROP POLICY IF EXISTS "coursework_submission_update_student" ON public."CourseworkSubmission";

CREATE POLICY "coursework_submission_update_staff" ON public."CourseworkSubmission"
  FOR UPDATE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR public.acadia_is_admin_or_registrar()
    )
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR public.acadia_is_admin_or_registrar()
    )
  );

CREATE POLICY "coursework_submission_update_own" ON public."CourseworkSubmission"
  FOR UPDATE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_student()
    AND "studentProfileId" = public.acadia_current_student_profile_id()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_student()
    AND "studentProfileId" = public.acadia_current_student_profile_id()
  );

CREATE OR REPLACE FUNCTION public.acadia_coursework_submission_student_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.acadia_is_staff_or_teacher() OR public.acadia_is_admin_or_registrar() THEN
    RETURN NEW;
  END IF;

  IF public.acadia_is_student()
     AND NEW."studentProfileId" = public.acadia_current_student_profile_id() THEN
    IF NEW."confirmedScore" IS DISTINCT FROM OLD."confirmedScore"
       OR NEW."confirmedAt" IS DISTINCT FROM OLD."confirmedAt"
       OR NEW."confirmedByUserId" IS DISTINCT FROM OLD."confirmedByUserId" THEN
      RAISE EXCEPTION 'Students cannot change grading fields on coursework submissions.'
        USING ERRCODE = '42501';
    END IF;
    IF OLD."confirmedScore" IS NOT NULL THEN
      RAISE EXCEPTION 'Confirmed submissions cannot be edited by students.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS coursework_submission_student_guard
  ON public."CourseworkSubmission";
CREATE TRIGGER coursework_submission_student_guard
  BEFORE UPDATE ON public."CourseworkSubmission"
  FOR EACH ROW
  EXECUTE FUNCTION public.acadia_coursework_submission_student_guard();

-- ---------------------------------------------------------------------------
-- Scheme mark: subject teachers (SCSA) + academic admin only (not class masters)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acadia_can_mark_scheme_progress(
  p_class_id text,
  p_subject_id text,
  p_academic_year_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.acadia_is_admin_or_registrar()
    OR (
      public.acadia_is_staff_or_teacher()
      AND public.acadia_current_staff_profile_id() IS NOT NULL
      AND p_class_id IS NOT NULL
      AND p_subject_id IS NOT NULL
      AND p_academic_year_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public."StaffClassSubjectAssignment" a
        WHERE a."tenantId" = public.acadia_current_tenant_id()
          AND a."classId" = p_class_id
          AND a."subjectId" = p_subject_id
          AND a."academicYearId" = p_academic_year_id
          AND a."staffProfileId" = public.acadia_current_staff_profile_id()
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Scheme SELECT: drafts for academic admin only; published for scoped readers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acadia_can_view_scheme_of_work(p_scheme_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."SchemeOfWork" s
    WHERE s.id = p_scheme_id
      AND s."tenantId" = public.acadia_current_tenant_id()
      AND (
        public.acadia_is_admin_or_registrar()
        OR (
          s.status = 'PUBLISHED'
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
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_can_view_scheme_of_work(text) TO authenticated;

DROP POLICY IF EXISTS "SchemeOfWork_select_tenant" ON public."SchemeOfWork";
CREATE POLICY "SchemeOfWork_select_tenant" ON public."SchemeOfWork"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_view_scheme_of_work(id)
  );

DROP POLICY IF EXISTS "SchemeOfWorkTopic_select_tenant" ON public."SchemeOfWorkTopic";
CREATE POLICY "SchemeOfWorkTopic_select_tenant" ON public."SchemeOfWorkTopic"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_view_scheme_of_work("schemeOfWorkId")
  );

-- Progress writes require published scheme + matching class level
CREATE OR REPLACE FUNCTION public.acadia_set_scheme_topic_progress(
  p_tenant_id text,
  p_topic_id text,
  p_class_id text,
  p_completed boolean,
  p_staff_profile_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scheme_id text;
  v_subject_id text;
  v_year_id text;
  v_level_id text;
  v_status text;
  v_class_level text;
  v_parent_id text;
  v_ids text[] := ARRAY[]::text[];
  v_id text;
  v_now timestamptz := now();
  v_all_siblings boolean;
BEGIN
  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT t."schemeOfWorkId", t."parentTopicId", s."subjectId", s."academicYearId",
         s."levelId", s.status
  INTO v_scheme_id, v_parent_id, v_subject_id, v_year_id, v_level_id, v_status
  FROM public."SchemeOfWorkTopic" t
  JOIN public."SchemeOfWork" s ON s.id = t."schemeOfWorkId"
  WHERE t.id = p_topic_id
    AND t."tenantId" = p_tenant_id;

  IF v_scheme_id IS NULL THEN
    RAISE EXCEPTION 'Topic was not found.';
  END IF;

  IF v_status IS DISTINCT FROM 'PUBLISHED' THEN
    RAISE EXCEPTION 'Only published schemes can record topic coverage.';
  END IF;

  SELECT c."levelId"
  INTO v_class_level
  FROM public."Class" c
  WHERE c.id = p_class_id
    AND c."tenantId" = p_tenant_id;

  IF v_class_level IS NULL THEN
    RAISE EXCEPTION 'Class was not found.';
  END IF;

  IF v_class_level IS DISTINCT FROM v_level_id THEN
    RAISE EXCEPTION 'Class level does not match this scheme of work.';
  END IF;

  IF NOT public.acadia_can_mark_scheme_progress(p_class_id, v_subject_id, v_year_id) THEN
    RAISE EXCEPTION 'You can only mark topics for classes you teach.' USING ERRCODE = '42501';
  END IF;

  v_ids := array_append(v_ids, p_topic_id);

  IF v_parent_id IS NULL THEN
    SELECT array_agg(id)
    INTO v_ids
    FROM (
      SELECT p_topic_id AS id
      UNION ALL
      SELECT c.id
      FROM public."SchemeOfWorkTopic" c
      WHERE c."tenantId" = p_tenant_id
        AND c."parentTopicId" = p_topic_id
    ) ids;
  ELSIF NOT p_completed THEN
    v_ids := array_append(v_ids, v_parent_id);
  ELSE
    SELECT NOT EXISTS (
      SELECT 1
      FROM public."SchemeOfWorkTopic" sibling
      WHERE sibling."tenantId" = p_tenant_id
        AND sibling."parentTopicId" = v_parent_id
        AND sibling.id <> p_topic_id
        AND NOT EXISTS (
          SELECT 1
          FROM public."SchemeOfWorkTopicProgress" p
          WHERE p."tenantId" = p_tenant_id
            AND p."topicId" = sibling.id
            AND p."classId" = p_class_id
        )
    )
    INTO v_all_siblings;
    IF v_all_siblings THEN
      v_ids := array_append(v_ids, v_parent_id);
    END IF;
  END IF;

  FOREACH v_id IN ARRAY v_ids LOOP
    IF p_completed THEN
      INSERT INTO public."SchemeOfWorkTopicProgress" (
        id, "tenantId", "topicId", "classId", "completedAt",
        "completedByStaffProfileId", "createdAt"
      )
      VALUES (
        'sowp-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
        p_tenant_id, v_id, p_class_id, v_now, p_staff_profile_id, v_now
      )
      ON CONFLICT ("tenantId", "topicId", "classId") DO UPDATE
        SET "completedAt" = v_now,
            "completedByStaffProfileId" = p_staff_profile_id;
    ELSE
      DELETE FROM public."SchemeOfWorkTopicProgress"
      WHERE "tenantId" = p_tenant_id
        AND "topicId" = v_id
        AND "classId" = p_class_id;
    END IF;
  END LOOP;
END;
$$;
