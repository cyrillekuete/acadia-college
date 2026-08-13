-- Phase 7I: promotion decisions, data retention policy, RLS

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PromotionAction') THEN
    CREATE TYPE public."PromotionAction" AS ENUM (
      'PROMOTE',
      'REPEAT',
      'GRADUATE',
      'WITHDRAW',
      'DEFER'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PromotionDecisionSource') THEN
    CREATE TYPE public."PromotionDecisionSource" AS ENUM ('AUTO', 'MANUAL');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."StudentPromotionDecision" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "studentProfileId" text NOT NULL,
  "academicYearId" text NOT NULL,
  "specialtyId" text NOT NULL,
  "fromLevelId" text NOT NULL,
  "targetLevelId" text,
  "yearAverage" numeric(5, 2),
  "recommendedAction" public."PromotionAction" NOT NULL,
  "finalAction" public."PromotionAction" NOT NULL,
  source public."PromotionDecisionSource" NOT NULL DEFAULT 'AUTO'::public."PromotionDecisionSource",
  notes text,
  "decidedByUserId" text,
  "appliedAt" timestamp without time zone,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "StudentPromotionDecision_pkey" PRIMARY KEY (id),
  CONSTRAINT "StudentPromotionDecision_tenant_student_year_key"
    UNIQUE ("tenantId", "studentProfileId", "academicYearId"),
  CONSTRAINT "StudentPromotionDecision_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "StudentPromotionDecision_studentProfileId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "studentProfileId") REFERENCES public."StudentProfile"("tenantId", id),
  CONSTRAINT "StudentPromotionDecision_academicYearId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "academicYearId") REFERENCES public."AcademicYear"("tenantId", id),
  CONSTRAINT "StudentPromotionDecision_specialtyId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "specialtyId") REFERENCES public."Specialty"("tenantId", id),
  CONSTRAINT "StudentPromotionDecision_fromLevelId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "fromLevelId") REFERENCES public."Level"("tenantId", id),
  CONSTRAINT "StudentPromotionDecision_targetLevelId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "targetLevelId") REFERENCES public."Level"("tenantId", id),
  CONSTRAINT "StudentPromotionDecision_decidedByUserId_fkey"
    FOREIGN KEY ("decidedByUserId") REFERENCES public."User"(id)
);

CREATE TABLE IF NOT EXISTS public."TenantDataRetentionPolicy" (
  "tenantId" text NOT NULL,
  "marksRetentionYears" integer NOT NULL DEFAULT 7
    CHECK ("marksRetentionYears" >= 1 AND "marksRetentionYears" <= 30),
  "enrollmentRetentionYears" integer NOT NULL DEFAULT 10
    CHECK ("enrollmentRetentionYears" >= 1 AND "enrollmentRetentionYears" <= 30),
  "archiveInactiveAfterYears" integer NOT NULL DEFAULT 3
    CHECK ("archiveInactiveAfterYears" >= 1 AND "archiveInactiveAfterYears" <= 15),
  "lastArchivalRunAt" timestamp without time zone,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "TenantDataRetentionPolicy_pkey" PRIMARY KEY ("tenantId"),
  CONSTRAINT "TenantDataRetentionPolicy_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id)
);

CREATE INDEX IF NOT EXISTS "StudentPromotionDecision_tenant_year_idx"
  ON public."StudentPromotionDecision" ("tenantId", "academicYearId");

ALTER TABLE public."StudentPromotionDecision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TenantDataRetentionPolicy" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "StudentPromotionDecision_select_tenant" ON public."StudentPromotionDecision";
CREATE POLICY "StudentPromotionDecision_select_tenant"
  ON public."StudentPromotionDecision"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "StudentPromotionDecision_insert_admin" ON public."StudentPromotionDecision";
CREATE POLICY "StudentPromotionDecision_insert_admin"
  ON public."StudentPromotionDecision"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "StudentPromotionDecision_update_admin" ON public."StudentPromotionDecision";
CREATE POLICY "StudentPromotionDecision_update_admin"
  ON public."StudentPromotionDecision"
  FOR UPDATE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "StudentPromotionDecision_delete_admin" ON public."StudentPromotionDecision";
CREATE POLICY "StudentPromotionDecision_delete_admin"
  ON public."StudentPromotionDecision"
  FOR DELETE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "TenantDataRetentionPolicy_select_tenant" ON public."TenantDataRetentionPolicy";
CREATE POLICY "TenantDataRetentionPolicy_select_tenant"
  ON public."TenantDataRetentionPolicy"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "TenantDataRetentionPolicy_upsert_admin" ON public."TenantDataRetentionPolicy";
CREATE POLICY "TenantDataRetentionPolicy_upsert_admin"
  ON public."TenantDataRetentionPolicy"
  FOR ALL TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );
