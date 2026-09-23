-- Classic term bulletin: template id, divisional delegation, repeater, justified absences.

ALTER TABLE public."Tenant"
  ADD COLUMN IF NOT EXISTS "divisionalDelegation" text;

ALTER TABLE public."StudentEnrollment"
  ADD COLUMN IF NOT EXISTS "isRepeater" boolean NOT NULL DEFAULT false;

ALTER TABLE public."StudentTermDiscipline"
  ADD COLUMN IF NOT EXISTS "justifiedAbsences" integer NOT NULL DEFAULT 0;

ALTER TABLE public."StudentTermDiscipline"
  DROP CONSTRAINT IF EXISTS "StudentTermDiscipline_justifiedAbsences_check";

ALTER TABLE public."StudentTermDiscipline"
  ADD CONSTRAINT "StudentTermDiscipline_justifiedAbsences_check"
  CHECK ("justifiedAbsences" >= 0 AND "justifiedAbsences" <= 999);

ALTER TABLE public."ReportCardTemplatePreference"
  DROP CONSTRAINT IF EXISTS "ReportCardTemplatePreference_term1Template_check";
ALTER TABLE public."ReportCardTemplatePreference"
  DROP CONSTRAINT IF EXISTS "ReportCardTemplatePreference_term2Template_check";
ALTER TABLE public."ReportCardTemplatePreference"
  DROP CONSTRAINT IF EXISTS "ReportCardTemplatePreference_term3Template_check";
ALTER TABLE public."ReportCardTemplatePreference"
  DROP CONSTRAINT IF EXISTS "ReportCardTemplatePreference_annualTemplate_check";

ALTER TABLE public."ReportCardTemplatePreference"
  ADD CONSTRAINT "ReportCardTemplatePreference_term1Template_check"
  CHECK ("term1Template" IN ('sequence', 'yearSummary', 'classicTerm'));
ALTER TABLE public."ReportCardTemplatePreference"
  ADD CONSTRAINT "ReportCardTemplatePreference_term2Template_check"
  CHECK ("term2Template" IN ('sequence', 'yearSummary', 'classicTerm'));
ALTER TABLE public."ReportCardTemplatePreference"
  ADD CONSTRAINT "ReportCardTemplatePreference_term3Template_check"
  CHECK ("term3Template" IN ('sequence', 'yearSummary', 'classicTerm'));
ALTER TABLE public."ReportCardTemplatePreference"
  ADD CONSTRAINT "ReportCardTemplatePreference_annualTemplate_check"
  CHECK ("annualTemplate" IN ('sequence', 'yearSummary', 'classicTerm'));

-- Class masters may set repeater on their class without a general enrollment update.
CREATE OR REPLACE FUNCTION public.acadia_set_class_repeaters(
  p_academic_year_id text,
  p_class_id text,
  p_rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
  v_student_id text;
  v_repeater boolean;
BEGIN
  IF p_academic_year_id IS NULL OR btrim(p_academic_year_id) = ''
     OR p_class_id IS NULL OR btrim(p_class_id) = '' THEN
    RAISE EXCEPTION 'Class and academic year are required';
  END IF;

  IF NOT (
    public.acadia_is_admin_or_registrar()
    OR EXISTS (
      SELECT 1
      FROM public."Class" c
      WHERE c.id = p_class_id
        AND c."tenantId" = public.acadia_current_tenant_id()
        AND c."staffProfileId" = public.acadia_current_staff_profile_id()
    )
  ) THEN
    RAISE EXCEPTION 'Not allowed to set repeater status';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    v_student_id := btrim(COALESCE(v_row->>'studentProfileId', ''));
    IF v_student_id = '' THEN
      CONTINUE;
    END IF;
    v_repeater := COALESCE((v_row->>'isRepeater')::boolean, false);

    UPDATE public."StudentEnrollment"
    SET "isRepeater" = v_repeater,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "tenantId" = public.acadia_current_tenant_id()
      AND "academicYearId" = p_academic_year_id
      AND "classId" = p_class_id
      AND "studentProfileId" = v_student_id
      AND status = 'ENROLLED';
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.acadia_set_class_repeaters(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acadia_set_class_repeaters(text, text, jsonb) TO authenticated;
