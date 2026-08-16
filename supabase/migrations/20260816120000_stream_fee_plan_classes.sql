-- Year-scope StreamFeePlan and assign plans to one or more classes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AcademicYear_tenantId_id_key'
  ) THEN
    ALTER TABLE public."AcademicYear"
      ADD CONSTRAINT "AcademicYear_tenantId_id_key" UNIQUE ("tenantId", id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StreamFeePlan_tenantId_id_key'
  ) THEN
    ALTER TABLE public."StreamFeePlan"
      ADD CONSTRAINT "StreamFeePlan_tenantId_id_key" UNIQUE ("tenantId", id);
  END IF;
END $$;

ALTER TABLE public."StreamFeePlan"
  DROP CONSTRAINT IF EXISTS "StreamFeePlan_tenantId_subSystem_branch_key";

ALTER TABLE public."StreamFeePlan"
  ADD COLUMN IF NOT EXISTS "academicYearId" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StreamFeePlan_academicYearId_tenantId_fkey'
  ) THEN
    ALTER TABLE public."StreamFeePlan"
      ADD CONSTRAINT "StreamFeePlan_academicYearId_tenantId_fkey"
      FOREIGN KEY ("tenantId", "academicYearId")
      REFERENCES public."AcademicYear"("tenantId", id)
      ON DELETE RESTRICT;
  END IF;
END $$;

UPDATE public."StreamFeePlan" fp
SET "academicYearId" = (
  SELECT y.id
  FROM public."AcademicYear" y
  WHERE y."tenantId" = fp."tenantId"
  ORDER BY y."isCurrent" DESC, y."startsOn" DESC
  LIMIT 1
)
WHERE fp."academicYearId" IS NULL;

CREATE INDEX IF NOT EXISTS "StreamFeePlan_tenant_year_idx"
  ON public."StreamFeePlan" ("tenantId", "academicYearId");

CREATE TABLE IF NOT EXISTS public."StreamFeePlanClass" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "streamFeePlanId" text NOT NULL,
  "classId" text NOT NULL,
  "academicYearId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreamFeePlanClass_pkey" PRIMARY KEY (id),
  CONSTRAINT "StreamFeePlanClass_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "StreamFeePlanClass_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "StreamFeePlanClass_streamFeePlanId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "streamFeePlanId")
    REFERENCES public."StreamFeePlan"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "StreamFeePlanClass_classId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "classId")
    REFERENCES public."Class"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "StreamFeePlanClass_academicYearId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "academicYearId")
    REFERENCES public."AcademicYear"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "StreamFeePlanClass_tenant_year_class_key"
    UNIQUE ("tenantId", "academicYearId", "classId")
);

CREATE INDEX IF NOT EXISTS "StreamFeePlanClass_plan_idx"
  ON public."StreamFeePlanClass" ("tenantId", "streamFeePlanId");

CREATE INDEX IF NOT EXISTS "StreamFeePlanClass_class_idx"
  ON public."StreamFeePlanClass" ("tenantId", "classId");

ALTER TABLE public."StreamFeePlanClass" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "StreamFeePlanClass_select_tenant" ON public."StreamFeePlanClass";
CREATE POLICY "StreamFeePlanClass_select_tenant"
  ON public."StreamFeePlanClass"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "StreamFeePlanClass_insert_admin" ON public."StreamFeePlanClass";
CREATE POLICY "StreamFeePlanClass_insert_admin"
  ON public."StreamFeePlanClass"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "StreamFeePlanClass_update_admin" ON public."StreamFeePlanClass";
CREATE POLICY "StreamFeePlanClass_update_admin"
  ON public."StreamFeePlanClass"
  FOR UPDATE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "StreamFeePlanClass_delete_admin" ON public."StreamFeePlanClass";
CREATE POLICY "StreamFeePlanClass_delete_admin"
  ON public."StreamFeePlanClass"
  FOR DELETE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

INSERT INTO public."StreamFeePlanClass" (
  id,
  "tenantId",
  "streamFeePlanId",
  "classId",
  "academicYearId",
  "createdAt"
)
SELECT
  'fee-plan-class-' || substr(md5(fp.id || c.id), 1, 12),
  fp."tenantId",
  fp.id,
  c.id,
  fp."academicYearId",
  CURRENT_TIMESTAMP
FROM public."StreamFeePlan" fp
JOIN public."Class" c
  ON c."tenantId" = fp."tenantId"
 AND c."subSystem" = fp."subSystem"
 AND c.branch = fp.branch
WHERE fp."academicYearId" IS NOT NULL
ON CONFLICT ("tenantId", "academicYearId", "classId") DO NOTHING;
