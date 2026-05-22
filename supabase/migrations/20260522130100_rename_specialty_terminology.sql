-- Rename remaining "Specialty" terminology to stream-based naming.

-- 1. MessageGroupScope: SPECIALTY -> STREAM
ALTER TYPE public."MessageGroupScope" RENAME VALUE 'SPECIALTY' TO 'STREAM';

-- 2. GradingMode: PER_SPECIALTY -> PER_STREAM (RENAME VALUE updates existing rows)
ALTER TYPE public."GradingMode" RENAME VALUE 'PER_SPECIALTY' TO 'PER_STREAM';

-- 3. Drop orphan SpecialtyGradingSystem (Specialty table removed)
DROP TYPE IF EXISTS public."SpecialtyGradingSystem";

-- 4. SubjectSpecialtyOffering -> SubjectStreamOffering
ALTER TABLE public."SubjectSpecialtyOffering" RENAME TO "SubjectStreamOffering";

DO $$
DECLARE
  r RECORD;
  new_name text;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'SubjectStreamOffering'
  LOOP
    new_name := replace(
      replace(r.conname, 'SubjectSpecialtyOffering', 'SubjectStreamOffering'),
      'CourseSpecialtyOffering',
      'SubjectStreamOffering'
    );
    IF new_name <> r.conname THEN
      EXECUTE format(
        'ALTER TABLE public."SubjectStreamOffering" RENAME CONSTRAINT %I TO %I',
        r.conname,
        new_name
      );
    END IF;
  END LOOP;
END $$;

-- 5. StreamFeePlan FK constraint rename
ALTER TABLE public."StreamFeePlan"
  RENAME CONSTRAINT "SpecialtyFeePlan_tenantId_fkey" TO "StreamFeePlan_tenantId_fkey";
