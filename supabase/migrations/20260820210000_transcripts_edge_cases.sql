-- Transcript uniqueness + role-scoped SELECT for transcript tables.
-- Writes stay admin/registrar (acadia_is_admin_or_registrar).

-- ---------------------------------------------------------------------------
-- Dedupe extra transcripts (keep newest) before unique index.
-- ---------------------------------------------------------------------------
UPDATE public."Transcript" t
SET "currentVersionId" = NULL, "updatedAt" = now()
WHERE t.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "tenantId", "studentProfileId", "academicYearId", "termId"
        ORDER BY "updatedAt" DESC, "createdAt" DESC
      ) AS rn
    FROM public."Transcript"
  ) ranked
  WHERE rn > 1
);

DELETE FROM public."TranscriptVersion" v
WHERE v."transcriptId" IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "tenantId", "studentProfileId", "academicYearId", "termId"
        ORDER BY "updatedAt" DESC, "createdAt" DESC
      ) AS rn
    FROM public."Transcript"
  ) ranked
  WHERE rn > 1
);

DELETE FROM public."Transcript" t
WHERE t.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "tenantId", "studentProfileId", "academicYearId", "termId"
        ORDER BY "updatedAt" DESC, "createdAt" DESC
      ) AS rn
    FROM public."Transcript"
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "Transcript_tenant_student_year_term_uidx"
  ON public."Transcript" ("tenantId", "studentProfileId", "academicYearId", "termId");

-- ---------------------------------------------------------------------------
-- Shared SELECT helper (registry admin, self, linked guardian, assigned teacher)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acadia_can_select_student_transcript(
  p_student_profile_id text,
  p_academic_year_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.acadia_is_registry_admin()
    OR p_student_profile_id = public.acadia_current_student_profile_id()
    OR public.acadia_is_linked_guardian_of(p_student_profile_id)
    OR EXISTS (
      SELECT 1
      FROM public."StudentEnrollment" e
      WHERE e."tenantId" = public.acadia_current_tenant_id()
        AND e."studentProfileId" = p_student_profile_id
        AND (
          p_academic_year_id IS NULL
          OR e."academicYearId" = p_academic_year_id
        )
        AND public.acadia_teacher_assigned_to_class(e."classId", e."academicYearId")
    );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_can_select_student_transcript(text, text)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Scoped SELECT on Transcript and TranscriptCopyRequest
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Transcript_select_tenant" ON public."Transcript";
DROP POLICY IF EXISTS "Transcript_select_scoped" ON public."Transcript";
CREATE POLICY "Transcript_select_scoped"
  ON public."Transcript"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_select_student_transcript("studentProfileId", "academicYearId")
  );

DROP POLICY IF EXISTS "TranscriptCopyRequest_select_tenant" ON public."TranscriptCopyRequest";
DROP POLICY IF EXISTS "TranscriptCopyRequest_select_scoped" ON public."TranscriptCopyRequest";
CREATE POLICY "TranscriptCopyRequest_select_scoped"
  ON public."TranscriptCopyRequest"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_select_student_transcript("studentProfileId", NULL)
  );

-- ---------------------------------------------------------------------------
-- TranscriptVersion RLS (not previously version-controlled)
-- ---------------------------------------------------------------------------
ALTER TABLE public."TranscriptVersion" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TranscriptVersion_select_tenant" ON public."TranscriptVersion";
DROP POLICY IF EXISTS "TranscriptVersion_select_scoped" ON public."TranscriptVersion";
CREATE POLICY "TranscriptVersion_select_scoped"
  ON public."TranscriptVersion"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public."Transcript" t
      WHERE t.id = "TranscriptVersion"."transcriptId"
        AND t."tenantId" = "TranscriptVersion"."tenantId"
        AND public.acadia_can_select_student_transcript(t."studentProfileId", t."academicYearId")
    )
  );

DROP POLICY IF EXISTS "TranscriptVersion_insert_admin" ON public."TranscriptVersion";
CREATE POLICY "TranscriptVersion_insert_admin"
  ON public."TranscriptVersion"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "TranscriptVersion_update_admin" ON public."TranscriptVersion";
CREATE POLICY "TranscriptVersion_update_admin"
  ON public."TranscriptVersion"
  FOR UPDATE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "TranscriptVersion_delete_admin" ON public."TranscriptVersion";
CREATE POLICY "TranscriptVersion_delete_admin"
  ON public."TranscriptVersion"
  FOR DELETE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );
