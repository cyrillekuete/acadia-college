-- Subjects module edge cases: catalog uniqueness, class grouping overrides,
-- scheme-of-work copy/progress RPCs, and tighter progress RLS.

-- ---------------------------------------------------------------------------
-- Subject code uniqueness per tenant + academic year
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "academicYearId", upper(code)
      ORDER BY "createdAt", id
    ) AS rn
  FROM public."Subject"
  WHERE "academicYearId" IS NOT NULL
)
UPDATE public."Subject" s
SET code = left(s.code, 20) || '-' || right(replace(s.id, '-', ''), 8),
    "updatedAt" = now()
FROM ranked
WHERE s.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Subject_tenant_year_code_uidx"
  ON public."Subject" ("tenantId", "academicYearId", upper(code))
  WHERE "academicYearId" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Teacher assignment uniqueness + single lead
-- ---------------------------------------------------------------------------
DELETE FROM public."SubjectAssignment" a
USING public."SubjectAssignment" b
WHERE a."tenantId" = b."tenantId"
  AND a."subjectId" = b."subjectId"
  AND a."staffProfileId" = b."staffProfileId"
  AND a."academicYearId" = b."academicYearId"
  AND a.id <> b.id
  AND (
    a."updatedAt" < b."updatedAt"
    OR (a."updatedAt" = b."updatedAt" AND a.id < b.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS "SubjectAssignment_tenant_subject_staff_year_uidx"
  ON public."SubjectAssignment" ("tenantId", "subjectId", "staffProfileId", "academicYearId");

UPDATE public."SubjectAssignment" a
SET "isLead" = false, "updatedAt" = now()
WHERE a."isLead" = true
  AND EXISTS (
    SELECT 1
    FROM public."SubjectAssignment" b
    WHERE b."tenantId" = a."tenantId"
      AND b."subjectId" = a."subjectId"
      AND b."academicYearId" = a."academicYearId"
      AND b."isLead" = true
      AND (
        b."updatedAt" > a."updatedAt"
        OR (b."updatedAt" = a."updatedAt" AND b.id > a.id)
      )
  );

CREATE UNIQUE INDEX IF NOT EXISTS "SubjectAssignment_one_lead_uidx"
  ON public."SubjectAssignment" ("tenantId", "subjectId", "academicYearId")
  WHERE "isLead" = true;

-- ---------------------------------------------------------------------------
-- Class-level force-ungrouped override
-- ---------------------------------------------------------------------------
ALTER TABLE public."ClassSubject"
  ADD COLUMN IF NOT EXISTS "forceUngrouped" boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- Grouping codes: case-insensitive unique
-- ---------------------------------------------------------------------------
ALTER TABLE public."SubjectGrouping"
  DROP CONSTRAINT IF EXISTS "SubjectGrouping_tenantId_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "SubjectGrouping_tenant_lower_code_uidx"
  ON public."SubjectGrouping" ("tenantId", lower(code))
  WHERE code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Helpers: teaching scope for scheme progress
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
      AND (
        EXISTS (
          SELECT 1
          FROM public."StaffClassSubjectAssignment" a
          WHERE a."tenantId" = public.acadia_current_tenant_id()
            AND a."classId" = p_class_id
            AND a."subjectId" = p_subject_id
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
        OR EXISTS (
          SELECT 1
          FROM public."StaffClassAssignment" a
          WHERE a."tenantId" = public.acadia_current_tenant_id()
            AND a."classId" = p_class_id
            AND a."academicYearId" = p_academic_year_id
            AND a."staffProfileId" = public.acadia_current_staff_profile_id()
        )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_can_mark_scheme_progress(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_can_view_scheme_progress(
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
    public.acadia_is_admin_or_registrar()
    OR public.acadia_teacher_assigned_to_class(p_class_id, p_academic_year_id)
    OR (
      public.acadia_is_student()
      AND public.acadia_current_student_profile_id() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public."StudentEnrollment" e
        WHERE e."tenantId" = public.acadia_current_tenant_id()
          AND e."studentProfileId" = public.acadia_current_student_profile_id()
          AND e."classId" = p_class_id
          AND e."academicYearId" = p_academic_year_id
          AND e.status = 'ENROLLED'
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_can_view_scheme_progress(text, text) TO authenticated;

DROP POLICY IF EXISTS "SchemeOfWorkTopicProgress_select_tenant" ON public."SchemeOfWorkTopicProgress";
CREATE POLICY "SchemeOfWorkTopicProgress_select_tenant" ON public."SchemeOfWorkTopicProgress"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_view_scheme_progress(
      "classId",
      (
        SELECT s."academicYearId"
        FROM public."SchemeOfWorkTopic" t
        JOIN public."SchemeOfWork" s ON s.id = t."schemeOfWorkId"
        WHERE t.id = "topicId"
        LIMIT 1
      )
    )
  );

DROP POLICY IF EXISTS "SchemeOfWorkTopicProgress_insert_staff" ON public."SchemeOfWorkTopicProgress";
CREATE POLICY "SchemeOfWorkTopicProgress_insert_staff" ON public."SchemeOfWorkTopicProgress"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_mark_scheme_progress(
      "classId",
      (
        SELECT s."subjectId"
        FROM public."SchemeOfWorkTopic" t
        JOIN public."SchemeOfWork" s ON s.id = t."schemeOfWorkId"
        WHERE t.id = "topicId"
        LIMIT 1
      ),
      (
        SELECT s."academicYearId"
        FROM public."SchemeOfWorkTopic" t
        JOIN public."SchemeOfWork" s ON s.id = t."schemeOfWorkId"
        WHERE t.id = "topicId"
        LIMIT 1
      )
    )
  );

DROP POLICY IF EXISTS "SchemeOfWorkTopicProgress_update_staff" ON public."SchemeOfWorkTopicProgress";
CREATE POLICY "SchemeOfWorkTopicProgress_update_staff" ON public."SchemeOfWorkTopicProgress"
  FOR UPDATE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_mark_scheme_progress(
      "classId",
      (
        SELECT s."subjectId"
        FROM public."SchemeOfWorkTopic" t
        JOIN public."SchemeOfWork" s ON s.id = t."schemeOfWorkId"
        WHERE t.id = "topicId"
        LIMIT 1
      ),
      (
        SELECT s."academicYearId"
        FROM public."SchemeOfWorkTopic" t
        JOIN public."SchemeOfWork" s ON s.id = t."schemeOfWorkId"
        WHERE t.id = "topicId"
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_mark_scheme_progress(
      "classId",
      (
        SELECT s."subjectId"
        FROM public."SchemeOfWorkTopic" t
        JOIN public."SchemeOfWork" s ON s.id = t."schemeOfWorkId"
        WHERE t.id = "topicId"
        LIMIT 1
      ),
      (
        SELECT s."academicYearId"
        FROM public."SchemeOfWorkTopic" t
        JOIN public."SchemeOfWork" s ON s.id = t."schemeOfWorkId"
        WHERE t.id = "topicId"
        LIMIT 1
      )
    )
  );

DROP POLICY IF EXISTS "SchemeOfWorkTopicProgress_delete_staff" ON public."SchemeOfWorkTopicProgress";
CREATE POLICY "SchemeOfWorkTopicProgress_delete_staff" ON public."SchemeOfWorkTopicProgress"
  FOR DELETE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_mark_scheme_progress(
      "classId",
      (
        SELECT s."subjectId"
        FROM public."SchemeOfWorkTopic" t
        JOIN public."SchemeOfWork" s ON s.id = t."schemeOfWorkId"
        WHERE t.id = "topicId"
        LIMIT 1
      ),
      (
        SELECT s."academicYearId"
        FROM public."SchemeOfWorkTopic" t
        JOIN public."SchemeOfWork" s ON s.id = t."schemeOfWorkId"
        WHERE t.id = "topicId"
        LIMIT 1
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Atomic subject save
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acadia_save_subject(
  p_tenant_id text,
  p_subject_id text,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_id text;
  v_code text;
  v_name_en text;
  v_name_fr text;
  v_year_id text;
  v_sub_system public."AcademicSubSystem";
  v_branch public."AcademicBranch";
  v_level_ids text[];
  v_level_id text;
  v_has_papers boolean;
  v_copy_from text;
  v_branch_row jsonb;
  v_branch_id text;
  v_keep_ids text[] := ARRAY[]::text[];
  v_idx int := 0;
BEGIN
  IF NOT public.acadia_is_admin_or_registrar() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  v_code := upper(btrim(p_payload->>'code'));
  v_name_en := btrim(p_payload->>'nameEn');
  v_name_fr := nullif(btrim(p_payload->>'nameFr'), '');
  IF v_name_fr IS NULL THEN
    v_name_fr := v_name_en;
  END IF;
  v_year_id := p_payload->>'academicYearId';
  v_sub_system := (p_payload->>'subSystem')::public."AcademicSubSystem";
  v_branch := (p_payload->>'branch')::public."AcademicBranch";
  v_has_papers := COALESCE((p_payload->>'hasSubBranches')::boolean, false);
  v_copy_from := nullif(p_payload->>'copyAssignmentsFromSubjectId', '');

  SELECT array_agg(value)
  INTO v_level_ids
  FROM jsonb_array_elements_text(COALESCE(p_payload->'levelIds', '[]'::jsonb)) AS value;

  IF v_code IS NULL OR v_code = '' OR v_name_en = '' OR v_year_id IS NULL OR v_level_ids IS NULL THEN
    RAISE EXCEPTION 'invalid subject payload';
  END IF;

  v_level_id := v_level_ids[1];
  v_id := nullif(p_subject_id, '');
  IF v_id IS NULL THEN
    v_id := 'subject-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_tenant_id || ':' || v_year_id || ':' || lower(v_name_en), 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public."Subject" s
    LEFT JOIN public."SubjectLevel" sl
      ON sl."subjectId" = s.id AND sl."tenantId" = s."tenantId"
    WHERE s."tenantId" = p_tenant_id
      AND s."academicYearId" = v_year_id
      AND s."subSystem" = v_sub_system
      AND s.branch = v_branch
      AND s."deactivatedAt" IS NULL
      AND s.id <> v_id
      AND lower(btrim(s."nameEn")) = lower(v_name_en)
      AND COALESCE(sl."levelId", s."levelId") = ANY (v_level_ids)
  ) THEN
    RAISE EXCEPTION 'A subject with this name already covers one of the selected levels in this year and stream. Create a level variant with non-overlapping levels instead.';
  END IF;

  IF v_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public."Subject" WHERE id = v_id AND "tenantId" = p_tenant_id
  ) THEN
    UPDATE public."Subject"
    SET
      code = v_code,
      "nameEn" = v_name_en,
      "nameFr" = v_name_fr,
      "subSystem" = v_sub_system,
      branch = v_branch,
      "levelId" = v_level_id,
      "academicYearId" = v_year_id,
      "termId" = NULL,
      coefficient = COALESCE((p_payload->>'coefficient')::numeric, 1),
      "groupingId" = nullif(p_payload->>'groupingId', ''),
      "hasSubBranches" = v_has_papers,
      "updatedAt" = v_now
    WHERE id = v_id
      AND "tenantId" = p_tenant_id;
  ELSE
    INSERT INTO public."Subject" (
      id, "tenantId", code, "nameEn", "nameFr", credits, hours,
      "subSystem", branch, "levelId", "academicYearId", "termId",
      "subjectType", coefficient, "groupingId", "hasSubBranches",
      "createdAt", "updatedAt"
    ) VALUES (
      v_id, p_tenant_id, v_code, v_name_en, v_name_fr, 1, 1,
      v_sub_system, v_branch, v_level_id, v_year_id, NULL,
      COALESCE((p_payload->>'subjectType')::public.subject_type, 'OTHERS'),
      COALESCE((p_payload->>'coefficient')::numeric, 1),
      nullif(p_payload->>'groupingId', ''),
      v_has_papers,
      v_now, v_now
    );
  END IF;

  DELETE FROM public."SubjectLevel"
  WHERE "tenantId" = p_tenant_id
    AND "subjectId" = v_id
    AND "levelId" <> ALL (v_level_ids);

  FOREACH v_level_id IN ARRAY v_level_ids LOOP
    INSERT INTO public."SubjectLevel" (
      id, "tenantId", "subjectId", "levelId", "createdAt"
    )
    VALUES (
      'slev-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
      p_tenant_id, v_id, v_level_id, v_now
    )
    ON CONFLICT ("tenantId", "subjectId", "levelId") DO NOTHING;
  END LOOP;

  IF NOT v_has_papers THEN
    IF EXISTS (
      SELECT 1
      FROM public."SubjectMark" m
      JOIN public."SubjectSubBranch" b
        ON b.id = m."subjectSubBranchId" AND b."tenantId" = m."tenantId"
      WHERE b."tenantId" = p_tenant_id
        AND b."subjectId" = v_id
    ) THEN
      RAISE EXCEPTION 'Cannot remove papers that already have marks. Keep the papers or retire the subject.';
    END IF;
    DELETE FROM public."SubjectSubBranch"
    WHERE "tenantId" = p_tenant_id AND "subjectId" = v_id;
  ELSE
    FOR v_branch_row IN
      SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'subBranches', '[]'::jsonb))
    LOOP
      v_idx := v_idx + 1;
      v_branch_id := nullif(btrim(v_branch_row->>'id'), '');
      IF v_branch_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public."SubjectSubBranch"
        WHERE id = v_branch_id AND "tenantId" = p_tenant_id AND "subjectId" = v_id
      ) THEN
        UPDATE public."SubjectSubBranch"
        SET
          name = btrim(v_branch_row->>'name'),
          "nameFr" = COALESCE(nullif(btrim(v_branch_row->>'nameFr'), ''), btrim(v_branch_row->>'name')),
          coefficient = CASE
            WHEN COALESCE((v_branch_row->>'hasCustomCoefficient')::boolean, false)
            THEN NULLIF(v_branch_row->>'coefficient', '')::numeric
            ELSE NULL
          END,
          "sortOrder" = v_idx - 1,
          "updatedAt" = v_now
        WHERE id = v_branch_id AND "tenantId" = p_tenant_id;
      ELSE
        v_branch_id := 'subbranch-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
        INSERT INTO public."SubjectSubBranch" (
          id, "tenantId", "subjectId", name, "nameFr", coefficient, "sortOrder",
          "createdAt", "updatedAt"
        ) VALUES (
          v_branch_id,
          p_tenant_id,
          v_id,
          btrim(v_branch_row->>'name'),
          COALESCE(nullif(btrim(v_branch_row->>'nameFr'), ''), btrim(v_branch_row->>'name')),
          CASE
            WHEN COALESCE((v_branch_row->>'hasCustomCoefficient')::boolean, false)
            THEN NULLIF(v_branch_row->>'coefficient', '')::numeric
            ELSE NULL
          END,
          v_idx - 1,
          v_now,
          v_now
        );
      END IF;
      v_keep_ids := array_append(v_keep_ids, v_branch_id);
    END LOOP;

    IF EXISTS (
      SELECT 1
      FROM public."SubjectMark" m
      JOIN public."SubjectSubBranch" b
        ON b.id = m."subjectSubBranchId" AND b."tenantId" = m."tenantId"
      WHERE b."tenantId" = p_tenant_id
        AND b."subjectId" = v_id
        AND (cardinality(v_keep_ids) = 0 OR b.id <> ALL (v_keep_ids))
    ) THEN
      RAISE EXCEPTION 'Cannot remove papers that already have marks. Keep the papers or retire the subject.';
    END IF;

    DELETE FROM public."SubjectSubBranch"
    WHERE "tenantId" = p_tenant_id
      AND "subjectId" = v_id
      AND (cardinality(v_keep_ids) = 0 OR id <> ALL (v_keep_ids));
  END IF;

  IF v_copy_from IS NOT NULL AND p_subject_id IS NULL THEN
    INSERT INTO public."SubjectAssignment" (
      id, "tenantId", "subjectId", "academicYearId", "staffProfileId",
      "isLead", "teachesPrimaryHome", notes, "createdAt", "updatedAt"
    )
    SELECT
      'assign-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
      p_tenant_id,
      v_id,
      a."academicYearId",
      a."staffProfileId",
      a."isLead",
      a."teachesPrimaryHome",
      a.notes,
      v_now,
      v_now
    FROM public."SubjectAssignment" a
    WHERE a."tenantId" = p_tenant_id
      AND a."subjectId" = v_copy_from
    ON CONFLICT ("tenantId", "subjectId", "staffProfileId", "academicYearId") DO NOTHING;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_save_subject(text, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Scheme of work: reorder, progress cascade, copy
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acadia_reorder_scheme_topics(
  p_tenant_id text,
  p_topic_ids text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idx int;
BEGIN
  IF NOT public.acadia_is_admin_or_registrar() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  IF p_topic_ids IS NULL THEN
    RETURN;
  END IF;

  FOR v_idx IN 1 .. coalesce(array_length(p_topic_ids, 1), 0) LOOP
    UPDATE public."SchemeOfWorkTopic"
    SET "sortOrder" = v_idx - 1, "updatedAt" = now()
    WHERE "tenantId" = p_tenant_id
      AND id = p_topic_ids[v_idx];
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_reorder_scheme_topics(text, text[]) TO authenticated;

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
  v_parent_id text;
  v_ids text[] := ARRAY[]::text[];
  v_id text;
  v_now timestamptz := now();
  v_all_siblings boolean;
BEGIN
  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT t."schemeOfWorkId", t."parentTopicId", s."subjectId", s."academicYearId"
  INTO v_scheme_id, v_parent_id, v_subject_id, v_year_id
  FROM public."SchemeOfWorkTopic" t
  JOIN public."SchemeOfWork" s ON s.id = t."schemeOfWorkId"
  WHERE t.id = p_topic_id
    AND t."tenantId" = p_tenant_id;

  IF v_scheme_id IS NULL THEN
    RAISE EXCEPTION 'Topic was not found.';
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

GRANT EXECUTE ON FUNCTION public.acadia_set_scheme_topic_progress(text, text, text, boolean, text) TO authenticated;

-- Unique progress rows so the RPC can upsert.
CREATE UNIQUE INDEX IF NOT EXISTS "SchemeOfWorkTopicProgress_tenant_topic_class_uidx"
  ON public."SchemeOfWorkTopicProgress" ("tenantId", "topicId", "classId");

CREATE OR REPLACE FUNCTION public.acadia_copy_schemes_of_work(
  p_tenant_id text,
  p_source_year_id text,
  p_target_year_id text,
  p_source_scheme_id text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_src record;
  v_new_id text;
  v_now timestamptz := now();
  v_map jsonb := '{}'::jsonb;
  v_topic record;
  v_new_topic_id text;
BEGIN
  IF NOT public.acadia_is_admin_or_registrar() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;
  IF p_source_year_id IS NULL OR p_target_year_id IS NULL OR p_source_year_id = p_target_year_id THEN
    RAISE EXCEPTION 'invalid academic years';
  END IF;

  FOR v_src IN
    SELECT *
    FROM public."SchemeOfWork"
    WHERE "tenantId" = p_tenant_id
      AND "academicYearId" = p_source_year_id
      AND (p_source_scheme_id IS NULL OR id = p_source_scheme_id)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public."SchemeOfWork" t
      WHERE t."tenantId" = p_tenant_id
        AND t."academicYearId" = p_target_year_id
        AND t."subjectId" = v_src."subjectId"
        AND t."levelId" = v_src."levelId"
    ) THEN
      CONTINUE;
    END IF;

    v_new_id := 'sow-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    INSERT INTO public."SchemeOfWork" (
      id, "tenantId", "academicYearId", "subjectId", "levelId", status,
      "createdAt", "updatedAt"
    ) VALUES (
      v_new_id, p_tenant_id, p_target_year_id, v_src."subjectId", v_src."levelId",
      'DRAFT', v_now, v_now
    );
    v_map := '{}'::jsonb;

    FOR v_topic IN
      SELECT *
      FROM public."SchemeOfWorkTopic"
      WHERE "tenantId" = p_tenant_id
        AND "schemeOfWorkId" = v_src.id
      ORDER BY "parentTopicId" NULLS FIRST, "sortOrder", id
    LOOP
      v_new_topic_id := 'sowt-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
      INSERT INTO public."SchemeOfWorkTopic" (
        id, "tenantId", "schemeOfWorkId", "parentTopicId",
        "titleEn", "titleFr", "descriptionEn", "descriptionFr",
        "sortOrder", "createdAt", "updatedAt"
      ) VALUES (
        v_new_topic_id,
        p_tenant_id,
        v_new_id,
        CASE
          WHEN v_topic."parentTopicId" IS NULL THEN NULL
          ELSE v_map ->> v_topic."parentTopicId"
        END,
        v_topic."titleEn",
        v_topic."titleFr",
        v_topic."descriptionEn",
        v_topic."descriptionFr",
        v_topic."sortOrder",
        v_now,
        v_now
      );
      v_map := v_map || jsonb_build_object(v_topic.id, v_new_topic_id);
    END LOOP;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_copy_schemes_of_work(text, text, text, text) TO authenticated;
