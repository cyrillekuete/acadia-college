-- Subject catalog: type, coefficient, optional grouping, sub-branches

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subject_type') THEN
    CREATE TYPE public.subject_type AS ENUM (
      'LANGUAGES',
      'RELATED_TRADE_SUBJECTS',
      'TRADE_SUBJECTS',
      'OTHERS'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."SubjectGrouping" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "nameEn" text NOT NULL,
  "nameFr" text NOT NULL,
  code text,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubjectGrouping_pkey" PRIMARY KEY (id),
  CONSTRAINT "SubjectGrouping_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "SubjectGrouping_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SubjectGrouping_tenantId_code_key"
    UNIQUE ("tenantId", code)
);

ALTER TABLE public."Subject"
  ADD COLUMN IF NOT EXISTS "subjectType" public.subject_type NOT NULL DEFAULT 'OTHERS'::public.subject_type,
  ADD COLUMN IF NOT EXISTS coefficient numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS "groupingId" text,
  ADD COLUMN IF NOT EXISTS "hasSubBranches" boolean NOT NULL DEFAULT false;

ALTER TABLE public."Subject"
  DROP CONSTRAINT IF EXISTS "Subject_coefficient_check";

ALTER TABLE public."Subject"
  ADD CONSTRAINT "Subject_coefficient_check" CHECK (coefficient > 0::numeric);

ALTER TABLE public."Subject"
  DROP CONSTRAINT IF EXISTS "Subject_groupingId_tenantId_fkey";

ALTER TABLE public."Subject"
  ADD CONSTRAINT "Subject_groupingId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "groupingId")
    REFERENCES public."SubjectGrouping"("tenantId", id)
    ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public."SubjectSubBranch" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "subjectId" text NOT NULL,
  name text NOT NULL,
  "nameFr" text,
  coefficient numeric NOT NULL DEFAULT 1.0,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubjectSubBranch_pkey" PRIMARY KEY (id),
  CONSTRAINT "SubjectSubBranch_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "SubjectSubBranch_coefficient_check" CHECK (coefficient > 0::numeric),
  CONSTRAINT "SubjectSubBranch_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SubjectSubBranch_subjectId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "subjectId")
    REFERENCES public."Subject"("tenantId", id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Subject_groupingId_tenantId_idx"
  ON public."Subject" ("tenantId", "groupingId");

CREATE INDEX IF NOT EXISTS "SubjectSubBranch_tenantId_subjectId_idx"
  ON public."SubjectSubBranch" ("tenantId", "subjectId");

-- RLS: SubjectGrouping
ALTER TABLE public."SubjectGrouping" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SubjectGrouping_select_tenant" ON public."SubjectGrouping";
CREATE POLICY "SubjectGrouping_select_tenant"
  ON public."SubjectGrouping"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "SubjectGrouping_insert_admin" ON public."SubjectGrouping";
CREATE POLICY "SubjectGrouping_insert_admin"
  ON public."SubjectGrouping"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "SubjectGrouping_update_admin" ON public."SubjectGrouping";
CREATE POLICY "SubjectGrouping_update_admin"
  ON public."SubjectGrouping"
  FOR UPDATE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar());

DROP POLICY IF EXISTS "SubjectGrouping_delete_admin" ON public."SubjectGrouping";
CREATE POLICY "SubjectGrouping_delete_admin"
  ON public."SubjectGrouping"
  FOR DELETE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar());

-- RLS: SubjectSubBranch
ALTER TABLE public."SubjectSubBranch" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SubjectSubBranch_select_tenant" ON public."SubjectSubBranch";
CREATE POLICY "SubjectSubBranch_select_tenant"
  ON public."SubjectSubBranch"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "SubjectSubBranch_insert_admin" ON public."SubjectSubBranch";
CREATE POLICY "SubjectSubBranch_insert_admin"
  ON public."SubjectSubBranch"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "SubjectSubBranch_update_admin" ON public."SubjectSubBranch";
CREATE POLICY "SubjectSubBranch_update_admin"
  ON public."SubjectSubBranch"
  FOR UPDATE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar());

DROP POLICY IF EXISTS "SubjectSubBranch_delete_admin" ON public."SubjectSubBranch";
CREATE POLICY "SubjectSubBranch_delete_admin"
  ON public."SubjectSubBranch"
  FOR DELETE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar());
