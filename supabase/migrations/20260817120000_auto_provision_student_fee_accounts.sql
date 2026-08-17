-- Auto-provision student fee accounts: one account per student per year,
-- carry-over credit after class change, and set-based backfill.

ALTER TABLE public."StudentFeeAccount"
  ADD COLUMN IF NOT EXISTS "creditMinor" integer NOT NULL DEFAULT 0;

ALTER TABLE public."StudentFeeAccount"
  ADD COLUMN IF NOT EXISTS "streamFeePlanId" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StudentFeeAccount_creditMinor_check'
  ) THEN
    ALTER TABLE public."StudentFeeAccount"
      ADD CONSTRAINT "StudentFeeAccount_creditMinor_check"
      CHECK ("creditMinor" >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StudentFeeAccount_streamFeePlanId_tenantId_fkey'
  ) THEN
    ALTER TABLE public."StudentFeeAccount"
      ADD CONSTRAINT "StudentFeeAccount_streamFeePlanId_tenantId_fkey"
      FOREIGN KEY ("tenantId", "streamFeePlanId")
      REFERENCES public."StreamFeePlan"("tenantId", id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Keep the oldest account when duplicates already exist.
DELETE FROM public."StudentFeeInstallment" si
WHERE EXISTS (
  SELECT 1
  FROM public."StudentFeeAccount" a
  WHERE a.id = si."studentFeeAccountId"
    AND a."tenantId" = si."tenantId"
    AND EXISTS (
      SELECT 1
      FROM public."StudentFeeAccount" keeper
      WHERE keeper."tenantId" = a."tenantId"
        AND keeper."studentProfileId" = a."studentProfileId"
        AND keeper."academicYearId" = a."academicYearId"
        AND (
          keeper."createdAt" < a."createdAt"
          OR (keeper."createdAt" = a."createdAt" AND keeper.id < a.id)
        )
    )
);

DELETE FROM public."StudentScholarship" ss
WHERE EXISTS (
  SELECT 1
  FROM public."StudentFeeAccount" a
  WHERE a.id = ss."studentFeeAccountId"
    AND a."tenantId" = ss."tenantId"
    AND EXISTS (
      SELECT 1
      FROM public."StudentFeeAccount" keeper
      WHERE keeper."tenantId" = a."tenantId"
        AND keeper."studentProfileId" = a."studentProfileId"
        AND keeper."academicYearId" = a."academicYearId"
        AND (
          keeper."createdAt" < a."createdAt"
          OR (keeper."createdAt" = a."createdAt" AND keeper.id < a.id)
        )
    )
);

DELETE FROM public."StudentFeeAccount" a
WHERE EXISTS (
  SELECT 1
  FROM public."StudentFeeAccount" keeper
  WHERE keeper."tenantId" = a."tenantId"
    AND keeper."studentProfileId" = a."studentProfileId"
    AND keeper."academicYearId" = a."academicYearId"
    AND (
      keeper."createdAt" < a."createdAt"
      OR (keeper."createdAt" = a."createdAt" AND keeper.id < a.id)
    )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StudentFeeAccount_tenant_student_year_key'
  ) THEN
    ALTER TABLE public."StudentFeeAccount"
      ADD CONSTRAINT "StudentFeeAccount_tenant_student_year_key"
      UNIQUE ("tenantId", "studentProfileId", "academicYearId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "StudentFeeAccount_tenant_year_idx"
  ON public."StudentFeeAccount" ("tenantId", "academicYearId");

CREATE OR REPLACE FUNCTION public.acadia_count_missing_fee_accounts(
  p_academic_year_id text,
  p_class_id text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant text;
  v_count integer := 0;
BEGIN
  IF NOT public.acadia_is_admin_or_registrar() THEN
    RAISE EXCEPTION 'Not authorized to provision fee accounts.';
  END IF;

  v_tenant := public.acadia_current_tenant_id();
  IF v_tenant IS NULL OR p_academic_year_id IS NULL OR btrim(p_academic_year_id) = '' THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_count
  FROM public."StudentEnrollment" e
  INNER JOIN public."StreamFeePlanClass" p
    ON p."tenantId" = e."tenantId"
    AND p."academicYearId" = e."academicYearId"
    AND p."classId" = e."classId"
  INNER JOIN public."StreamFeePlan" fp
    ON fp.id = p."streamFeePlanId"
    AND fp."tenantId" = p."tenantId"
  LEFT JOIN public."StudentFeeAccount" a
    ON a."tenantId" = e."tenantId"
    AND a."studentProfileId" = e."studentProfileId"
    AND a."academicYearId" = e."academicYearId"
  WHERE e."tenantId" = v_tenant
    AND e."academicYearId" = p_academic_year_id
    AND e.status = 'ENROLLED'
    AND e."classId" IS NOT NULL
    AND btrim(e."classId") <> ''
    AND a.id IS NULL
    AND (p_class_id IS NULL OR btrim(p_class_id) = '' OR e."classId" = p_class_id)
    AND (
      SELECT COALESCE(SUM((x.elem->>'amountMinor')::integer), 0)
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(fp.installments::jsonb) = 'array' THEN fp.installments::jsonb
          ELSE '[]'::jsonb
        END
      ) AS x(elem)
    ) > 0;

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.acadia_provision_missing_fee_accounts(
  p_academic_year_id text,
  p_class_id text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant text;
  v_created integer := 0;
BEGIN
  IF NOT public.acadia_is_admin_or_registrar() THEN
    RAISE EXCEPTION 'Not authorized to provision fee accounts.';
  END IF;

  v_tenant := public.acadia_current_tenant_id();
  IF v_tenant IS NULL OR p_academic_year_id IS NULL OR btrim(p_academic_year_id) = '' THEN
    RETURN 0;
  END IF;

  WITH missing AS (
    SELECT
      e.id AS enrollment_id,
      e."studentProfileId",
      e."academicYearId",
      e."subSystem",
      e.branch,
      p."streamFeePlanId",
      fp.installments,
      (
        SELECT COALESCE(SUM((x.elem->>'amountMinor')::integer), 0)
        FROM jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(fp.installments::jsonb) = 'array' THEN fp.installments::jsonb
            ELSE '[]'::jsonb
          END
        ) AS x(elem)
      ) AS total_minor
    FROM public."StudentEnrollment" e
    INNER JOIN public."StreamFeePlanClass" p
      ON p."tenantId" = e."tenantId"
      AND p."academicYearId" = e."academicYearId"
      AND p."classId" = e."classId"
    INNER JOIN public."StreamFeePlan" fp
      ON fp.id = p."streamFeePlanId"
      AND fp."tenantId" = p."tenantId"
    LEFT JOIN public."StudentFeeAccount" a
      ON a."tenantId" = e."tenantId"
      AND a."studentProfileId" = e."studentProfileId"
      AND a."academicYearId" = e."academicYearId"
    WHERE e."tenantId" = v_tenant
      AND e."academicYearId" = p_academic_year_id
      AND e.status = 'ENROLLED'
      AND e."classId" IS NOT NULL
      AND btrim(e."classId") <> ''
      AND a.id IS NULL
      AND (p_class_id IS NULL OR btrim(p_class_id) = '' OR e."classId" = p_class_id)
  ),
  created AS (
    INSERT INTO public."StudentFeeAccount" (
      id,
      "tenantId",
      "studentProfileId",
      "academicYearId",
      "subSystem",
      branch,
      "studentEnrollmentId",
      "streamFeePlanId",
      "totalAmountMinor",
      "creditMinor",
      "feeCurrency",
      "createdAt",
      "updatedAt"
    )
    SELECT
      'fee-acct-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
      v_tenant,
      m."studentProfileId",
      m."academicYearId",
      m."subSystem",
      m.branch,
      m.enrollment_id,
      m."streamFeePlanId",
      m.total_minor,
      0,
      'XAF',
      now(),
      now()
    FROM missing m
    WHERE m.total_minor > 0
    ON CONFLICT ("tenantId", "studentProfileId", "academicYearId") DO NOTHING
    RETURNING id, "tenantId", "studentProfileId", "academicYearId"
  ),
  ins_inst AS (
    INSERT INTO public."StudentFeeInstallment" (
      id,
      "tenantId",
      "studentFeeAccountId",
      "installmentNumber",
      "labelEn",
      "labelFr",
      "amountMinor",
      "dueOn",
      status,
      "paidAmountMinor",
      "paidAt",
      notes,
      "updatedByUserId",
      "createdAt",
      "updatedAt"
    )
    SELECT
      'fee-inst-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
      c."tenantId",
      c.id,
      COALESCE((elem->>'installmentNumber')::integer, ord::integer),
      COALESCE(elem->>'labelEn', ''),
      COALESCE(elem->>'labelFr', ''),
      COALESCE((elem->>'amountMinor')::integer, 0),
      COALESCE(NULLIF(elem->>'dueOn', ''), CURRENT_DATE::text),
      'PENDING',
      NULL,
      NULL,
      NULL,
      NULL,
      now(),
      now()
    FROM created c
    INNER JOIN missing m
      ON m."studentProfileId" = c."studentProfileId"
      AND m."academicYearId" = c."academicYearId"
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(m.installments::jsonb) = 'array' THEN m.installments::jsonb
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS inst(elem, ord)
    WHERE COALESCE((elem->>'amountMinor')::integer, 0) > 0
    RETURNING id
  )
  SELECT COUNT(*)::integer
  INTO v_created
  FROM created;

  RETURN COALESCE(v_created, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_count_missing_fee_accounts(text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.acadia_provision_missing_fee_accounts(text, text)
  TO authenticated;
