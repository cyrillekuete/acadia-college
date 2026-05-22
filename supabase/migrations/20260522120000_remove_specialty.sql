-- Remove Specialty entity; academic catalog uses subSystem + branch only.

-- 1. StudentProfile
ALTER TABLE public."StudentProfile"
  ADD COLUMN IF NOT EXISTS "subSystem" public."AcademicSubSystem",
  ADD COLUMN IF NOT EXISTS branch public."AcademicBranch";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public."StudentProfile" sp
    WHERE sp."specialtyId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public."Specialty" s
        WHERE s.id = sp."specialtyId"
          AND s."tenantId" = sp."tenantId"
      )
  ) THEN
    RAISE EXCEPTION
      'StudentProfile rows reference missing Specialty records; review before migration.';
  END IF;
END $$;

UPDATE public."StudentProfile" sp
SET
  "subSystem" = COALESCE(sp."subSystem", s."subSystem"),
  branch = COALESCE(sp.branch, s.branch)
FROM public."Specialty" s
WHERE sp."specialtyId" = s.id
  AND sp."tenantId" = s."tenantId";

UPDATE public."StudentProfile"
SET
  "subSystem" = COALESCE("subSystem", 'ENGLISH'::public."AcademicSubSystem"),
  branch = COALESCE(branch, 'GRAMMAR'::public."AcademicBranch")
WHERE ("subSystem" IS NULL OR branch IS NULL)
  AND "specialtyId" IS NULL;

ALTER TABLE public."StudentProfile"
  ALTER COLUMN "subSystem" SET NOT NULL,
  ALTER COLUMN branch SET NOT NULL;

ALTER TABLE public."StudentProfile"
  DROP CONSTRAINT IF EXISTS "StudentProfile_specialtyId_tenantId_fkey";

ALTER TABLE public."StudentProfile"
  DROP COLUMN IF EXISTS "specialtyId";

-- 2. StudentEnrollment
ALTER TABLE public."StudentEnrollment"
  ADD COLUMN IF NOT EXISTS "subSystem" public."AcademicSubSystem",
  ADD COLUMN IF NOT EXISTS branch public."AcademicBranch";

UPDATE public."StudentEnrollment" se
SET
  "subSystem" = COALESCE(se."subSystem", s."subSystem"),
  branch = COALESCE(se.branch, s.branch)
FROM public."Specialty" s
WHERE se."specialtyId" = s.id
  AND se."tenantId" = s."tenantId";

UPDATE public."StudentEnrollment"
SET
  "subSystem" = COALESCE("subSystem", 'ENGLISH'::public."AcademicSubSystem"),
  branch = COALESCE(branch, 'GRAMMAR'::public."AcademicBranch")
WHERE "subSystem" IS NULL OR branch IS NULL;

ALTER TABLE public."StudentEnrollment"
  ALTER COLUMN "subSystem" SET NOT NULL,
  ALTER COLUMN branch SET NOT NULL;

ALTER TABLE public."StudentEnrollment"
  DROP CONSTRAINT IF EXISTS "StudentEnrollment_specialtyId_tenantId_fkey";

ALTER TABLE public."StudentEnrollment"
  DROP COLUMN IF EXISTS "specialtyId";

-- 3. EnrollmentApplication
UPDATE public."EnrollmentApplication" ea
SET
  "subSystem" = COALESCE(ea."subSystem", s."subSystem"),
  branch = COALESCE(ea.branch, s.branch)
FROM public."Specialty" s
WHERE ea."specialtyId" = s.id
  AND ea."tenantId" = s."tenantId";

UPDATE public."EnrollmentApplication"
SET
  "subSystem" = COALESCE("subSystem", 'ENGLISH'::public."AcademicSubSystem"),
  branch = COALESCE(branch, 'GRAMMAR'::public."AcademicBranch")
WHERE "subSystem" IS NULL OR branch IS NULL;

ALTER TABLE public."EnrollmentApplication"
  ALTER COLUMN "subSystem" SET NOT NULL,
  ALTER COLUMN branch SET NOT NULL;

ALTER TABLE public."EnrollmentApplication"
  DROP CONSTRAINT IF EXISTS "EnrollmentApplication_specialtyId_tenantId_fkey";

ALTER TABLE public."EnrollmentApplication"
  DROP COLUMN IF EXISTS "specialtyId";

-- 4. Subject
ALTER TABLE public."Subject"
  ADD COLUMN IF NOT EXISTS "subSystem" public."AcademicSubSystem",
  ADD COLUMN IF NOT EXISTS branch public."AcademicBranch";

UPDATE public."Subject" sub
SET
  "subSystem" = COALESCE(sub."subSystem", s."subSystem"),
  branch = COALESCE(sub.branch, s.branch)
FROM public."Specialty" s
WHERE sub."specialtyId" = s.id
  AND sub."tenantId" = s."tenantId";

UPDATE public."Subject"
SET
  "subSystem" = COALESCE("subSystem", 'ENGLISH'::public."AcademicSubSystem"),
  branch = COALESCE(branch, 'GRAMMAR'::public."AcademicBranch")
WHERE "subSystem" IS NULL OR branch IS NULL;

ALTER TABLE public."Subject"
  ALTER COLUMN "subSystem" SET NOT NULL,
  ALTER COLUMN branch SET NOT NULL;

ALTER TABLE public."Subject"
  DROP CONSTRAINT IF EXISTS "Subject_specialtyId_tenantId_fkey";

ALTER TABLE public."Subject"
  DROP COLUMN IF EXISTS "specialtyId";

-- 5. SubjectSpecialtyOffering (legacy join table)
ALTER TABLE public."SubjectSpecialtyOffering"
  ADD COLUMN IF NOT EXISTS "subSystem" public."AcademicSubSystem",
  ADD COLUMN IF NOT EXISTS branch public."AcademicBranch";

UPDATE public."SubjectSpecialtyOffering" sso
SET
  "subSystem" = COALESCE(sso."subSystem", s."subSystem"),
  branch = COALESCE(sso.branch, s.branch)
FROM public."Specialty" s
WHERE sso."specialtyId" = s.id
  AND sso."tenantId" = s."tenantId";

UPDATE public."SubjectSpecialtyOffering"
SET
  "subSystem" = COALESCE("subSystem", 'ENGLISH'::public."AcademicSubSystem"),
  branch = COALESCE(branch, 'GRAMMAR'::public."AcademicBranch")
WHERE "subSystem" IS NULL OR branch IS NULL;

ALTER TABLE public."SubjectSpecialtyOffering"
  ALTER COLUMN "subSystem" SET NOT NULL,
  ALTER COLUMN branch SET NOT NULL;

ALTER TABLE public."SubjectSpecialtyOffering"
  DROP CONSTRAINT IF EXISTS "SubjectSpecialtyOffering_specialtyId_tenantId_fkey";

ALTER TABLE public."SubjectSpecialtyOffering"
  DROP COLUMN IF EXISTS "specialtyId";

-- 6. StudentFeeAccount
ALTER TABLE public."StudentFeeAccount"
  ADD COLUMN IF NOT EXISTS "subSystem" public."AcademicSubSystem",
  ADD COLUMN IF NOT EXISTS branch public."AcademicBranch";

UPDATE public."StudentFeeAccount" fa
SET
  "subSystem" = COALESCE(fa."subSystem", s."subSystem"),
  branch = COALESCE(fa.branch, s.branch)
FROM public."Specialty" s
WHERE fa."specialtyId" = s.id
  AND fa."tenantId" = s."tenantId";

UPDATE public."StudentFeeAccount"
SET
  "subSystem" = COALESCE("subSystem", 'ENGLISH'::public."AcademicSubSystem"),
  branch = COALESCE(branch, 'GRAMMAR'::public."AcademicBranch")
WHERE "subSystem" IS NULL OR branch IS NULL;

ALTER TABLE public."StudentFeeAccount"
  ALTER COLUMN "subSystem" SET NOT NULL,
  ALTER COLUMN branch SET NOT NULL;

ALTER TABLE public."StudentFeeAccount"
  DROP CONSTRAINT IF EXISTS "StudentFeeAccount_specialtyId_tenantId_fkey";

ALTER TABLE public."StudentFeeAccount"
  DROP COLUMN IF EXISTS "specialtyId";

-- 7. StudentPromotionDecision
ALTER TABLE public."StudentPromotionDecision"
  ADD COLUMN IF NOT EXISTS "subSystem" public."AcademicSubSystem",
  ADD COLUMN IF NOT EXISTS branch public."AcademicBranch";

UPDATE public."StudentPromotionDecision" pd
SET
  "subSystem" = COALESCE(pd."subSystem", s."subSystem"),
  branch = COALESCE(pd.branch, s.branch)
FROM public."Specialty" s
WHERE pd."specialtyId" = s.id
  AND pd."tenantId" = s."tenantId";

UPDATE public."StudentPromotionDecision"
SET
  "subSystem" = COALESCE("subSystem", 'ENGLISH'::public."AcademicSubSystem"),
  branch = COALESCE(branch, 'GRAMMAR'::public."AcademicBranch")
WHERE "subSystem" IS NULL OR branch IS NULL;

ALTER TABLE public."StudentPromotionDecision"
  ALTER COLUMN "subSystem" SET NOT NULL,
  ALTER COLUMN branch SET NOT NULL;

ALTER TABLE public."StudentPromotionDecision"
  DROP CONSTRAINT IF EXISTS "StudentPromotionDecision_specialtyId_tenantId_fkey";

ALTER TABLE public."StudentPromotionDecision"
  DROP COLUMN IF EXISTS "specialtyId";

-- 8. Class (optional specialty link)
ALTER TABLE public."Class"
  DROP CONSTRAINT IF EXISTS "Class_specialtyId_tenantId_fkey";

ALTER TABLE public."Class"
  DROP COLUMN IF EXISTS "specialtyId";

-- 9. SpecialtyFeePlan -> StreamFeePlan
ALTER TABLE public."SpecialtyFeePlan"
  ADD COLUMN IF NOT EXISTS "subSystem" public."AcademicSubSystem",
  ADD COLUMN IF NOT EXISTS branch public."AcademicBranch";

UPDATE public."SpecialtyFeePlan" fp
SET
  "subSystem" = COALESCE(fp."subSystem", s."subSystem"),
  branch = COALESCE(fp.branch, s.branch)
FROM public."Specialty" s
WHERE fp."specialtyId" = s.id
  AND fp."tenantId" = s."tenantId";

UPDATE public."SpecialtyFeePlan"
SET
  "subSystem" = COALESCE("subSystem", 'ENGLISH'::public."AcademicSubSystem"),
  branch = COALESCE(branch, 'GRAMMAR'::public."AcademicBranch")
WHERE "subSystem" IS NULL OR branch IS NULL;

ALTER TABLE public."SpecialtyFeePlan"
  DROP CONSTRAINT IF EXISTS "SpecialtyFeePlan_specialtyId_tenantId_fkey";

ALTER TABLE public."SpecialtyFeePlan"
  DROP COLUMN IF EXISTS "specialtyId";

ALTER TABLE public."SpecialtyFeePlan"
  ALTER COLUMN "subSystem" SET NOT NULL,
  ALTER COLUMN branch SET NOT NULL;

ALTER TABLE public."SpecialtyFeePlan"
  RENAME TO "StreamFeePlan";

ALTER TABLE public."StreamFeePlan"
  ADD CONSTRAINT "StreamFeePlan_tenantId_subSystem_branch_key"
  UNIQUE ("tenantId", "subSystem", branch);

-- 10. Drop Specialty (FK constraints removed in steps 1–9)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    JOIN pg_class frel ON frel.oid = c.confrelid
    WHERE n.nspname = 'public'
      AND frel.relname = 'Specialty'
      AND c.contype = 'f'
  ) THEN
    RAISE EXCEPTION
      'Unexpected foreign key still references Specialty; aborting drop.';
  END IF;
END $$;

DROP TABLE IF EXISTS public."Specialty";

-- 11. RLS: replace SpecialtyFeePlan policies with StreamFeePlan
DO $$
DECLARE
  tbl text := 'StreamFeePlan';
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'SpecialtyFeePlan_select_tenant', tbl);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'SpecialtyFeePlan_insert_admin', tbl);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'SpecialtyFeePlan_update_admin', tbl);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'SpecialtyFeePlan_delete_admin', tbl);

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select_tenant', tbl);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ("tenantId" = public.acadia_current_tenant_id())',
    tbl || '_select_tenant',
    tbl
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_insert_admin', tbl);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
    tbl || '_insert_admin',
    tbl
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_update_admin', tbl);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar()) WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
    tbl || '_update_admin',
    tbl
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_delete_admin', tbl);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
    tbl || '_delete_admin',
    tbl
  );
END $$;
