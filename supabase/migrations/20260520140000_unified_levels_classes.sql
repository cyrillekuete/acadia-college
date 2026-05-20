-- Unified Level + Class academic structure (consolidate per-specialty levels)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassStatus') THEN
    CREATE TYPE public."ClassStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END $$;

-- 1. Extend Level with unified catalog fields
ALTER TABLE public."Level"
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS "subSystem" public."AcademicSubSystem",
  ADD COLUMN IF NOT EXISTS branch public."AcademicBranch";

UPDATE public."Level" l
SET
  name = COALESCE(NULLIF(trim(l."labelEn"), ''), NULLIF(trim(l."labelFr"), ''), 'Level ' || l.number::text),
  "subSystem" = s."subSystem",
  branch = s.branch
FROM public."Specialty" s
WHERE l."specialtyId" = s.id
  AND l."tenantId" = s."tenantId"
  AND (l.name IS NULL OR l."subSystem" IS NULL OR l.branch IS NULL);

UPDATE public."Level"
SET
  name = COALESCE(name, 'Level ' || number::text),
  "subSystem" = COALESCE("subSystem", 'ENGLISH'::public."AcademicSubSystem"),
  branch = COALESCE(branch, 'GRAMMAR'::public."AcademicBranch")
WHERE name IS NULL OR "subSystem" IS NULL OR branch IS NULL;

-- 2. Map duplicate specialty-scoped levels to one canonical row per stream + number
CREATE TEMP TABLE level_id_map ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    l.id,
    l."tenantId",
    l."subSystem",
    l.branch,
    l.number,
    FIRST_VALUE(l.id) OVER (
      PARTITION BY l."tenantId", l."subSystem", l.branch, l.number
      ORDER BY l."createdAt" ASC NULLS LAST, l.id ASC
    ) AS canonical_id
  FROM public."Level" l
)
SELECT id AS old_id, canonical_id AS new_id, "tenantId"
FROM ranked
WHERE id <> canonical_id;

-- 3. Create Class + ClassSubject tables
CREATE TABLE IF NOT EXISTS public."Class" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  name text NOT NULL,
  "levelId" text NOT NULL,
  "subSystem" public."AcademicSubSystem" NOT NULL,
  branch public."AcademicBranch" NOT NULL,
  "specialtyId" text,
  "staffProfileId" text,
  status public."ClassStatus" NOT NULL DEFAULT 'ACTIVE'::public."ClassStatus",
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Class_pkey" PRIMARY KEY (id),
  CONSTRAINT "Class_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "Class_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "Class_levelId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "levelId") REFERENCES public."Level"("tenantId", id),
  CONSTRAINT "Class_specialtyId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "specialtyId") REFERENCES public."Specialty"("tenantId", id),
  CONSTRAINT "Class_staffProfileId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "staffProfileId") REFERENCES public."StaffProfile"("tenantId", id),
  CONSTRAINT "Class_tenantId_subSystem_branch_name_key"
    UNIQUE ("tenantId", "subSystem", branch, name)
);

CREATE TABLE IF NOT EXISTS public."ClassSubject" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "classId" text NOT NULL,
  "subjectId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassSubject_pkey" PRIMARY KEY (id),
  CONSTRAINT "ClassSubject_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "ClassSubject_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "ClassSubject_classId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "classId") REFERENCES public."Class"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "ClassSubject_subjectId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "subjectId") REFERENCES public."Subject"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "ClassSubject_tenantId_classId_subjectId_key"
    UNIQUE ("tenantId", "classId", "subjectId")
);

-- 4. Seed Class rows from former per-specialty levels (before deduplication deletes)
INSERT INTO public."Class" (
  id,
  "tenantId",
  name,
  "levelId",
  "subSystem",
  branch,
  "specialtyId",
  status,
  "createdAt",
  "updatedAt"
)
SELECT
  'cls-' || replace(l.id, '-', ''),
  l."tenantId",
  trim(l.name || ' ' || s."nameEn"),
  COALESCE(m.new_id, l.id),
  l."subSystem",
  l.branch,
  l."specialtyId",
  'ACTIVE'::public."ClassStatus",
  l."createdAt",
  COALESCE(l."createdAt", CURRENT_TIMESTAMP)
FROM public."Level" l
JOIN public."Specialty" s
  ON s.id = l."specialtyId" AND s."tenantId" = l."tenantId"
LEFT JOIN level_id_map m ON m.old_id = l.id
ON CONFLICT ("tenantId", "subSystem", branch, name) DO NOTHING;

-- 5. Remap foreign keys to canonical level ids
UPDATE public."StudentEnrollment" se
SET "levelId" = m.new_id
FROM level_id_map m
WHERE se."levelId" = m.old_id AND se."tenantId" = m."tenantId";

UPDATE public."EnrollmentApplication" ea
SET "levelId" = m.new_id
FROM level_id_map m
WHERE ea."levelId" = m.old_id AND ea."tenantId" = m."tenantId";

UPDATE public."Subject" sub
SET "levelId" = m.new_id
FROM level_id_map m
WHERE sub."levelId" = m.old_id AND sub."tenantId" = m."tenantId";

UPDATE public."SubjectSpecialtyOffering" sso
SET "levelId" = m.new_id
FROM level_id_map m
WHERE sso."levelId" = m.old_id AND sso."tenantId" = m."tenantId";

UPDATE public."Term" t
SET "levelId" = m.new_id
FROM level_id_map m
WHERE t."levelId" = m.old_id AND t."tenantId" = m."tenantId";

UPDATE public."StudentPromotionDecision" spd
SET "fromLevelId" = m.new_id
FROM level_id_map m
WHERE spd."fromLevelId" = m.old_id AND spd."tenantId" = m."tenantId";

UPDATE public."StudentPromotionDecision" spd
SET "targetLevelId" = m.new_id
FROM level_id_map m
WHERE spd."targetLevelId" = m.old_id AND spd."tenantId" = m."tenantId";

-- 6. Remove duplicate Level rows
DELETE FROM public."Level" l
USING level_id_map m
WHERE l.id = m.old_id;

-- 7. Drop specialty scope from Level
ALTER TABLE public."Level" DROP CONSTRAINT IF EXISTS "Level_specialtyId_tenantId_fkey";
ALTER TABLE public."Level" DROP COLUMN IF EXISTS "specialtyId";

ALTER TABLE public."Level"
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN "subSystem" SET NOT NULL,
  ALTER COLUMN branch SET NOT NULL;

ALTER TABLE public."Level" DROP CONSTRAINT IF EXISTS "Level_tenantId_subSystem_branch_name_key";
ALTER TABLE public."Level"
  ADD CONSTRAINT "Level_tenantId_subSystem_branch_name_key"
  UNIQUE ("tenantId", "subSystem", branch, name);

-- 8. StudentEnrollment.classId
ALTER TABLE public."StudentEnrollment"
  ADD COLUMN IF NOT EXISTS "classId" text;

ALTER TABLE public."StudentEnrollment" DROP CONSTRAINT IF EXISTS "StudentEnrollment_classId_tenantId_fkey";
ALTER TABLE public."StudentEnrollment"
  ADD CONSTRAINT "StudentEnrollment_classId_tenantId_fkey"
  FOREIGN KEY ("tenantId", "classId") REFERENCES public."Class"("tenantId", id);

UPDATE public."StudentEnrollment" se
SET "classId" = c.id
FROM public."Class" c
WHERE se."classId" IS NULL
  AND se."tenantId" = c."tenantId"
  AND se."levelId" = c."levelId"
  AND se."specialtyId" = c."specialtyId";

CREATE INDEX IF NOT EXISTS "Class_tenantId_levelId_idx"
  ON public."Class" ("tenantId", "levelId");

CREATE INDEX IF NOT EXISTS "ClassSubject_tenantId_classId_idx"
  ON public."ClassSubject" ("tenantId", "classId");

-- 9. RLS for Class + ClassSubject
ALTER TABLE public."Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ClassSubject" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Class_select_tenant" ON public."Class";
CREATE POLICY "Class_select_tenant"
  ON public."Class"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "Class_insert_admin" ON public."Class";
CREATE POLICY "Class_insert_admin"
  ON public."Class"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "Class_update_admin" ON public."Class";
CREATE POLICY "Class_update_admin"
  ON public."Class"
  FOR UPDATE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar());

DROP POLICY IF EXISTS "Class_delete_admin" ON public."Class";
CREATE POLICY "Class_delete_admin"
  ON public."Class"
  FOR DELETE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar());

DROP POLICY IF EXISTS "ClassSubject_select_tenant" ON public."ClassSubject";
CREATE POLICY "ClassSubject_select_tenant"
  ON public."ClassSubject"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "ClassSubject_insert_admin" ON public."ClassSubject";
CREATE POLICY "ClassSubject_insert_admin"
  ON public."ClassSubject"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "ClassSubject_update_admin" ON public."ClassSubject";
CREATE POLICY "ClassSubject_update_admin"
  ON public."ClassSubject"
  FOR UPDATE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar());

DROP POLICY IF EXISTS "ClassSubject_delete_admin" ON public."ClassSubject";
CREATE POLICY "ClassSubject_delete_admin"
  ON public."ClassSubject"
  FOR DELETE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar());
