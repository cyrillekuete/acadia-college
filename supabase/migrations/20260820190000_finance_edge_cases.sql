-- Finance edge cases: withdrawn freeze, atomic payment/rebill, closed-year
-- writes, scoped SELECT, paid/completed locks, optional sale student.

ALTER TABLE public."StudentFeeAccount"
  ADD COLUMN IF NOT EXISTS "withdrawnAt" timestamp without time zone;

ALTER TABLE public."FinanceSale"
  ALTER COLUMN "studentProfileId" DROP NOT NULL;

ALTER TABLE public."Expenditure"
  ALTER COLUMN "paymentDate" DROP NOT NULL;

DELETE FROM public."StudentScholarship" ss
WHERE EXISTS (
  SELECT 1
  FROM public."StudentScholarship" keeper
  WHERE keeper."tenantId" = ss."tenantId"
    AND keeper."studentFeeAccountId" = ss."studentFeeAccountId"
    AND keeper."scholarshipTypeId" = ss."scholarshipTypeId"
    AND (
      keeper."createdAt" < ss."createdAt"
      OR (keeper."createdAt" = ss."createdAt" AND keeper.id < ss.id)
    )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StudentScholarship_account_type_key'
  ) THEN
    ALTER TABLE public."StudentScholarship"
      ADD CONSTRAINT "StudentScholarship_account_type_key"
      UNIQUE ("tenantId", "studentFeeAccountId", "scholarshipTypeId");
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.acadia_assert_finance_year_open(p_academic_year_id text)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_active boolean;
BEGIN
  IF p_academic_year_id IS NULL OR btrim(p_academic_year_id) = '' THEN
    RETURN;
  END IF;
  SELECT "isActive" INTO v_active
  FROM public."AcademicYear"
  WHERE id = p_academic_year_id
    AND "tenantId" = public.acadia_current_tenant_id();
  IF v_active IS FALSE THEN
    RAISE EXCEPTION 'This academic year is closed.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_assert_finance_year_open(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_can_read_student_finance(
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
        AND (p_academic_year_id IS NULL OR e."academicYearId" = p_academic_year_id)
        AND public.acadia_teacher_assigned_to_class(e."classId", e."academicYearId")
    );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_can_read_student_finance(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_apply_fee_installment_updates(
  p_account_id text,
  p_updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant text;
  v_year text;
  v_update jsonb;
BEGIN
  v_tenant := public.acadia_current_tenant_id();
  IF v_tenant IS NULL OR NOT public.acadia_is_admin_or_registrar() THEN
    RAISE EXCEPTION 'Not authorized to record fee payments.';
  END IF;

  SELECT "academicYearId" INTO v_year
  FROM public."StudentFeeAccount"
  WHERE id = p_account_id AND "tenantId" = v_tenant
  FOR UPDATE;
  IF v_year IS NULL THEN
    RAISE EXCEPTION 'Fee account not found.';
  END IF;
  PERFORM public.acadia_assert_finance_year_open(v_year);

  FOR v_update IN SELECT * FROM jsonb_array_elements(COALESCE(p_updates, '[]'::jsonb))
  LOOP
    UPDATE public."StudentFeeInstallment"
    SET
      status = COALESCE(v_update->>'status', status)::public."FeeInstallmentStatus",
      "paidAmountMinor" = COALESCE((v_update->>'paidAmountMinor')::integer, "paidAmountMinor"),
      "paidAt" = COALESCE(v_update->>'paidAt', "paidAt"),
      notes = COALESCE(v_update->>'notes', notes),
      "updatedByUserId" = COALESCE(v_update->>'updatedByUserId', "updatedByUserId"),
      "updatedAt" = now()
    WHERE id = v_update->>'id'
      AND "tenantId" = v_tenant
      AND "studentFeeAccountId" = p_account_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_apply_fee_installment_updates(text, jsonb)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_replace_fee_installments(
  p_account_id text,
  p_stream_fee_plan_id text,
  p_total_amount_minor integer,
  p_credit_minor integer,
  p_sub_system text,
  p_branch text,
  p_enrollment_id text,
  p_rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant text;
  v_year text;
BEGIN
  v_tenant := public.acadia_current_tenant_id();
  IF v_tenant IS NULL OR NOT public.acadia_is_admin_or_registrar() THEN
    RAISE EXCEPTION 'Not authorized to rebill fee accounts.';
  END IF;

  SELECT "academicYearId" INTO v_year
  FROM public."StudentFeeAccount"
  WHERE id = p_account_id AND "tenantId" = v_tenant
  FOR UPDATE;
  IF v_year IS NULL THEN
    RAISE EXCEPTION 'Fee account not found.';
  END IF;
  PERFORM public.acadia_assert_finance_year_open(v_year);

  DELETE FROM public."StudentFeeInstallment"
  WHERE "tenantId" = v_tenant
    AND "studentFeeAccountId" = p_account_id;

  INSERT INTO public."StudentFeeInstallment" (
    id, "tenantId", "studentFeeAccountId", "installmentNumber",
    "labelEn", "labelFr", "amountMinor", "dueOn", status,
    "paidAmountMinor", "paidAt", notes, "updatedByUserId", "createdAt", "updatedAt"
  )
  SELECT
    COALESCE(elem->>'id', 'fee-inst-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    v_tenant,
    p_account_id,
    COALESCE((elem->>'installmentNumber')::integer, 1),
    COALESCE(elem->>'labelEn', ''),
    COALESCE(elem->>'labelFr', ''),
    COALESCE((elem->>'amountMinor')::integer, 0),
    COALESCE(NULLIF(elem->>'dueOn', ''), CURRENT_DATE::text),
    COALESCE(elem->>'status', 'PENDING')::public."FeeInstallmentStatus",
    NULLIF((elem->>'paidAmountMinor')::integer, 0),
    NULLIF(elem->>'paidAt', ''),
    NULLIF(elem->>'notes', ''),
    NULLIF(elem->>'updatedByUserId', ''),
    now(),
    now()
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS elem;

  UPDATE public."StudentFeeAccount"
  SET
    "streamFeePlanId" = COALESCE(NULLIF(p_stream_fee_plan_id, ''), "streamFeePlanId"),
    "totalAmountMinor" = COALESCE(p_total_amount_minor, "totalAmountMinor"),
    "creditMinor" = GREATEST(COALESCE(p_credit_minor, 0), 0),
    "subSystem" = COALESCE(p_sub_system, "subSystem")::public."AcademicSubSystem",
    branch = COALESCE(p_branch, branch)::public."AcademicBranch",
    "studentEnrollmentId" = COALESCE(NULLIF(p_enrollment_id, ''), "studentEnrollmentId"),
    "updatedAt" = now()
  WHERE id = p_account_id AND "tenantId" = v_tenant;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_replace_fee_installments(text, text, integer, integer, text, text, text, jsonb)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_finance_year_write_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_year text;
BEGIN
  IF TG_TABLE_NAME = 'StudentFeeInstallment' THEN
    SELECT "academicYearId" INTO v_year
    FROM public."StudentFeeAccount"
    WHERE id = COALESCE(NEW."studentFeeAccountId", OLD."studentFeeAccountId")
      AND "tenantId" = COALESCE(NEW."tenantId", OLD."tenantId");
  ELSIF TG_TABLE_NAME = 'StudentScholarship' THEN
    SELECT "academicYearId" INTO v_year
    FROM public."StudentFeeAccount"
    WHERE id = COALESCE(NEW."studentFeeAccountId", OLD."studentFeeAccountId")
      AND "tenantId" = COALESCE(NEW."tenantId", OLD."tenantId");
  ELSE
    v_year := COALESCE(NEW."academicYearId", OLD."academicYearId");
  END IF;
  PERFORM public.acadia_assert_finance_year_open(v_year);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS student_fee_account_year_guard ON public."StudentFeeAccount";
CREATE TRIGGER student_fee_account_year_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public."StudentFeeAccount"
  FOR EACH ROW EXECUTE FUNCTION public.acadia_finance_year_write_guard();

DROP TRIGGER IF EXISTS student_fee_installment_year_guard ON public."StudentFeeInstallment";
CREATE TRIGGER student_fee_installment_year_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public."StudentFeeInstallment"
  FOR EACH ROW EXECUTE FUNCTION public.acadia_finance_year_write_guard();

DROP TRIGGER IF EXISTS student_scholarship_year_guard ON public."StudentScholarship";
CREATE TRIGGER student_scholarship_year_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public."StudentScholarship"
  FOR EACH ROW EXECUTE FUNCTION public.acadia_finance_year_write_guard();

DROP TRIGGER IF EXISTS stream_fee_plan_year_guard ON public."StreamFeePlan";
CREATE TRIGGER stream_fee_plan_year_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public."StreamFeePlan"
  FOR EACH ROW EXECUTE FUNCTION public.acadia_finance_year_write_guard();

DROP TRIGGER IF EXISTS finance_sale_year_guard ON public."FinanceSale";
CREATE TRIGGER finance_sale_year_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public."FinanceSale"
  FOR EACH ROW EXECUTE FUNCTION public.acadia_finance_year_write_guard();

DROP TRIGGER IF EXISTS expenditure_year_guard ON public."Expenditure";
CREATE TRIGGER expenditure_year_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public."Expenditure"
  FOR EACH ROW EXECUTE FUNCTION public.acadia_finance_year_write_guard();

DROP TRIGGER IF EXISTS finance_ledger_year_guard ON public."FinanceLedgerEntry";
CREATE TRIGGER finance_ledger_year_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public."FinanceLedgerEntry"
  FOR EACH ROW EXECUTE FUNCTION public.acadia_finance_year_write_guard();

DROP TRIGGER IF EXISTS finance_budget_year_guard ON public."FinanceBudgetLine";
CREATE TRIGGER finance_budget_year_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public."FinanceBudgetLine"
  FOR EACH ROW EXECUTE FUNCTION public.acadia_finance_year_write_guard();

CREATE OR REPLACE FUNCTION public.acadia_expenditure_paid_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'PAID' THEN
    RAISE EXCEPTION 'Paid expenditures cannot be deleted.';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'PAID' THEN
    RAISE EXCEPTION 'Paid expenditures cannot be edited.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS expenditure_paid_lock ON public."Expenditure";
CREATE TRIGGER expenditure_paid_lock
  BEFORE UPDATE OR DELETE ON public."Expenditure"
  FOR EACH ROW EXECUTE FUNCTION public.acadia_expenditure_paid_lock();

CREATE OR REPLACE FUNCTION public.acadia_sale_completed_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Completed sales cannot be deleted. Cancel them instead.';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'COMPLETED' THEN
    IF NEW.status IS DISTINCT FROM 'CANCELLED'
      AND (
        NEW."itemType" IS DISTINCT FROM OLD."itemType"
        OR NEW."itemName" IS DISTINCT FROM OLD."itemName"
        OR NEW.quantity IS DISTINCT FROM OLD.quantity
        OR NEW."unitPriceMinor" IS DISTINCT FROM OLD."unitPriceMinor"
        OR NEW."totalMinor" IS DISTINCT FROM OLD."totalMinor"
        OR NEW."saleDate" IS DISTINCT FROM OLD."saleDate"
        OR NEW."studentProfileId" IS DISTINCT FROM OLD."studentProfileId"
      ) THEN
      RAISE EXCEPTION 'Completed sales can only be cancelled or have notes updated.';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS finance_sale_completed_lock ON public."FinanceSale";
CREATE TRIGGER finance_sale_completed_lock
  BEFORE UPDATE OR DELETE ON public."FinanceSale"
  FOR EACH ROW EXECUTE FUNCTION public.acadia_sale_completed_lock();

-- Scoped SELECT
DROP POLICY IF EXISTS "StudentFeeAccount_select_tenant" ON public."StudentFeeAccount";
DROP POLICY IF EXISTS "StudentFeeAccount_select_scoped" ON public."StudentFeeAccount";
CREATE POLICY "StudentFeeAccount_select_scoped"
  ON public."StudentFeeAccount"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_read_student_finance("studentProfileId", "academicYearId")
  );

DROP POLICY IF EXISTS "StudentFeeInstallment_select_tenant" ON public."StudentFeeInstallment";
DROP POLICY IF EXISTS "StudentFeeInstallment_select_scoped" ON public."StudentFeeInstallment";
CREATE POLICY "StudentFeeInstallment_select_scoped"
  ON public."StudentFeeInstallment"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public."StudentFeeAccount" a
      WHERE a.id = "StudentFeeInstallment"."studentFeeAccountId"
        AND a."tenantId" = "StudentFeeInstallment"."tenantId"
        AND public.acadia_can_read_student_finance(a."studentProfileId", a."academicYearId")
    )
  );

DROP POLICY IF EXISTS "StudentScholarship_select_tenant" ON public."StudentScholarship";
DROP POLICY IF EXISTS "StudentScholarship_select_scoped" ON public."StudentScholarship";
CREATE POLICY "StudentScholarship_select_scoped"
  ON public."StudentScholarship"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public."StudentFeeAccount" a
      WHERE a.id = "StudentScholarship"."studentFeeAccountId"
        AND a."tenantId" = "StudentScholarship"."tenantId"
        AND public.acadia_can_read_student_finance(a."studentProfileId", a."academicYearId")
    )
  );

DROP POLICY IF EXISTS "FinanceSale_select_tenant" ON public."FinanceSale";
DROP POLICY IF EXISTS "FinanceSale_select_scoped" ON public."FinanceSale";
CREATE POLICY "FinanceSale_select_scoped"
  ON public."FinanceSale"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_registry_admin()
      OR "studentProfileId" = public.acadia_current_student_profile_id()
      OR (
        "studentProfileId" IS NOT NULL
        AND public.acadia_is_linked_guardian_of("studentProfileId")
      )
    )
  );

DROP POLICY IF EXISTS "Expenditure_select_tenant" ON public."Expenditure";
DROP POLICY IF EXISTS "Expenditure_select_finance" ON public."Expenditure";
CREATE POLICY "Expenditure_select_finance"
  ON public."Expenditure"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_registry_admin()
  );

DROP POLICY IF EXISTS "FinanceLedgerEntry_select_tenant" ON public."FinanceLedgerEntry";
DROP POLICY IF EXISTS "FinanceLedgerEntry_select_finance" ON public."FinanceLedgerEntry";
CREATE POLICY "FinanceLedgerEntry_select_finance"
  ON public."FinanceLedgerEntry"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_registry_admin()
  );

DROP POLICY IF EXISTS "FinanceBudgetLine_select_tenant" ON public."FinanceBudgetLine";
DROP POLICY IF EXISTS "FinanceBudgetLine_select_finance" ON public."FinanceBudgetLine";
CREATE POLICY "FinanceBudgetLine_select_finance"
  ON public."FinanceBudgetLine"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_registry_admin()
  );

DROP POLICY IF EXISTS "StreamFeePlan_select_tenant" ON public."StreamFeePlan";
DROP POLICY IF EXISTS "StreamFeePlan_select_finance" ON public."StreamFeePlan";
CREATE POLICY "StreamFeePlan_select_finance"
  ON public."StreamFeePlan"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_registry_admin()
  );

DROP POLICY IF EXISTS "ScholarshipType_select_tenant" ON public."ScholarshipType";
DROP POLICY IF EXISTS "ScholarshipType_select_scoped" ON public."ScholarshipType";
CREATE POLICY "ScholarshipType_select_scoped"
  ON public."ScholarshipType"
  FOR SELECT TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_registry_admin()
      OR "isActive" = true
    )
  );
