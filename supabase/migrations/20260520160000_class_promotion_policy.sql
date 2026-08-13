-- Class-based promotion policies per academic year

CREATE TABLE IF NOT EXISTS public."ClassPromotionPolicy" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "classId" text NOT NULL,
  "academicYearId" text NOT NULL,
  "autoPromotionEnabled" boolean NOT NULL DEFAULT true,
  "minPromotionAverage" numeric(5, 2) NOT NULL DEFAULT 10
    CHECK ("minPromotionAverage" >= 0 AND "minPromotionAverage" <= 20),
  notes text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "ClassPromotionPolicy_pkey" PRIMARY KEY (id),
  CONSTRAINT "ClassPromotionPolicy_tenant_class_year_key"
    UNIQUE ("tenantId", "classId", "academicYearId"),
  CONSTRAINT "ClassPromotionPolicy_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "ClassPromotionPolicy_classId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "classId") REFERENCES public."Class"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "ClassPromotionPolicy_academicYearId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "academicYearId") REFERENCES public."AcademicYear"("tenantId", id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClassPromotionPolicy_tenant_year_idx"
  ON public."ClassPromotionPolicy" ("tenantId", "academicYearId");

ALTER TABLE public."ClassPromotionPolicy" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ClassPromotionPolicy_select_tenant" ON public."ClassPromotionPolicy";
CREATE POLICY "ClassPromotionPolicy_select_tenant"
  ON public."ClassPromotionPolicy"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "ClassPromotionPolicy_insert_admin" ON public."ClassPromotionPolicy";
CREATE POLICY "ClassPromotionPolicy_insert_admin"
  ON public."ClassPromotionPolicy"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "ClassPromotionPolicy_update_admin" ON public."ClassPromotionPolicy";
CREATE POLICY "ClassPromotionPolicy_update_admin"
  ON public."ClassPromotionPolicy"
  FOR UPDATE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "ClassPromotionPolicy_delete_admin" ON public."ClassPromotionPolicy";
CREATE POLICY "ClassPromotionPolicy_delete_admin"
  ON public."ClassPromotionPolicy"
  FOR DELETE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

-- Extend promotion decisions for class scope and policy snapshot
ALTER TABLE public."StudentPromotionDecision"
  ADD COLUMN IF NOT EXISTS "classId" text,
  ADD COLUMN IF NOT EXISTS "policyMinAverage" numeric(5, 2);

ALTER TABLE public."StudentPromotionDecision"
  DROP CONSTRAINT IF EXISTS "StudentPromotionDecision_classId_tenantId_fkey";

ALTER TABLE public."StudentPromotionDecision"
  ADD CONSTRAINT "StudentPromotionDecision_classId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "classId") REFERENCES public."Class"("tenantId", id);

CREATE INDEX IF NOT EXISTS "StudentPromotionDecision_tenant_year_class_idx"
  ON public."StudentPromotionDecision" ("tenantId", "academicYearId", "classId");
