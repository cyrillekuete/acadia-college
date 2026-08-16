-- School-year choice of bulletin layout (sequence columns vs year-summary table).

CREATE TABLE IF NOT EXISTS public."ReportCardTemplatePreference" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "academicYearId" text NOT NULL,
  "term1Template" text NOT NULL DEFAULT 'sequence',
  "term2Template" text NOT NULL DEFAULT 'sequence',
  "term3Template" text NOT NULL DEFAULT 'yearSummary',
  "annualTemplate" text NOT NULL DEFAULT 'yearSummary',
  "updatedByUserId" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportCardTemplatePreference_pkey" PRIMARY KEY (id),
  CONSTRAINT "ReportCardTemplatePreference_tenant_year_key"
    UNIQUE ("tenantId", "academicYearId"),
  CONSTRAINT "ReportCardTemplatePreference_term1Template_check"
    CHECK ("term1Template" IN ('sequence', 'yearSummary')),
  CONSTRAINT "ReportCardTemplatePreference_term2Template_check"
    CHECK ("term2Template" IN ('sequence', 'yearSummary')),
  CONSTRAINT "ReportCardTemplatePreference_term3Template_check"
    CHECK ("term3Template" IN ('sequence', 'yearSummary')),
  CONSTRAINT "ReportCardTemplatePreference_annualTemplate_check"
    CHECK ("annualTemplate" IN ('sequence', 'yearSummary')),
  CONSTRAINT "ReportCardTemplatePreference_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "ReportCardTemplatePreference_academicYearId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "academicYearId")
    REFERENCES public."AcademicYear"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "ReportCardTemplatePreference_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES public."User"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ReportCardTemplatePreference_tenant_year_idx"
  ON public."ReportCardTemplatePreference" ("tenantId", "academicYearId");

ALTER TABLE public."ReportCardTemplatePreference" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ReportCardTemplatePreference_select_tenant"
  ON public."ReportCardTemplatePreference";
CREATE POLICY "ReportCardTemplatePreference_select_tenant"
  ON public."ReportCardTemplatePreference"
  FOR SELECT
  TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "ReportCardTemplatePreference_insert_admin"
  ON public."ReportCardTemplatePreference";
CREATE POLICY "ReportCardTemplatePreference_insert_admin"
  ON public."ReportCardTemplatePreference"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "ReportCardTemplatePreference_update_admin"
  ON public."ReportCardTemplatePreference";
CREATE POLICY "ReportCardTemplatePreference_update_admin"
  ON public."ReportCardTemplatePreference"
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

DROP POLICY IF EXISTS "ReportCardTemplatePreference_delete_admin"
  ON public."ReportCardTemplatePreference";
CREATE POLICY "ReportCardTemplatePreference_delete_admin"
  ON public."ReportCardTemplatePreference"
  FOR DELETE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );
