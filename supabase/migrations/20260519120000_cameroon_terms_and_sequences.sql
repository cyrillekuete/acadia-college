-- Cameroon secondary-school calendar: Semester → Term, add AcademicSequence, admin RLS helper.

-- ---------------------------------------------------------------------------
-- Admin role helpers (registrar slug kept for legacy users)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.acadia_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(public.acadia_current_role_slug()) IN (
    'admin',
    'super-admin',
    'financial-director',
    'registrar'
  );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_is_admin_or_registrar()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.acadia_is_admin();
$$;

-- ---------------------------------------------------------------------------
-- Rename Semester → Term
-- ---------------------------------------------------------------------------

ALTER TABLE public."Semester" RENAME TO "Term";

ALTER TABLE public."AcademicCalendarMilestone" RENAME COLUMN "semesterId" TO "termId";
ALTER TABLE public."Course" RENAME COLUMN "semesterId" TO "termId";
ALTER TABLE public."CourseSpecialtyOffering" RENAME COLUMN "semesterId" TO "termId";
ALTER TABLE public."ExamSession" RENAME COLUMN "semesterId" TO "termId";
ALTER TABLE public."Transcript" RENAME COLUMN "semesterId" TO "termId";

-- Term: scoped to academic year (Cameroon: 3 terms per year)
ALTER TABLE public."Term"
  ADD COLUMN IF NOT EXISTS "academicYearId" text,
  ALTER COLUMN "levelId" DROP NOT NULL;

ALTER TABLE public."Term" DROP CONSTRAINT IF EXISTS "Semester_number_check";

ALTER TABLE public."Term"
  ADD CONSTRAINT "Term_number_check" CHECK (number = ANY (ARRAY[1, 2, 3]));

ALTER TABLE public."Term" DROP CONSTRAINT IF EXISTS "Term_tenantId_academicYearId_number_key";

ALTER TABLE public."Term"
  ADD CONSTRAINT "Term_tenantId_academicYearId_number_key"
  UNIQUE ("tenantId", "academicYearId", number);

ALTER TABLE public."Term" DROP CONSTRAINT IF EXISTS "Term_academicYearId_fkey";

ALTER TABLE public."Term"
  ADD CONSTRAINT "Term_academicYearId_fkey"
  FOREIGN KEY ("academicYearId") REFERENCES public."AcademicYear" (id);

-- ---------------------------------------------------------------------------
-- AcademicSequence (6 per year, 2 per term)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."AcademicSequence" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "academicYearId" text NOT NULL,
  "termId" text NOT NULL,
  number integer NOT NULL,
  "numberInTerm" integer NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicSequence_pkey" PRIMARY KEY (id),
  CONSTRAINT "AcademicSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant" (id),
  CONSTRAINT "AcademicSequence_academicYearId_fkey"
    FOREIGN KEY ("academicYearId") REFERENCES public."AcademicYear" (id),
  CONSTRAINT "AcademicSequence_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES public."Term" (id),
  CONSTRAINT "AcademicSequence_tenantId_academicYearId_number_key"
    UNIQUE ("tenantId", "academicYearId", number),
  CONSTRAINT "AcademicSequence_number_check" CHECK (number >= 1 AND number <= 6),
  CONSTRAINT "AcademicSequence_numberInTerm_check"
    CHECK ("numberInTerm" = ANY (ARRAY[1, 2]))
);

-- Exam sessions may link to a sequence (sequence exams)
ALTER TABLE public."ExamSession"
  ADD COLUMN IF NOT EXISTS "sequenceId" text;

ALTER TABLE public."ExamSession" DROP CONSTRAINT IF EXISTS "ExamSession_sequenceId_tenantId_fkey";

ALTER TABLE public."ExamSession"
  ADD CONSTRAINT "ExamSession_sequenceId_fkey"
  FOREIGN KEY ("sequenceId") REFERENCES public."AcademicSequence" (id);

-- ---------------------------------------------------------------------------
-- RLS for AcademicSequence (Term inherits policies from renamed Semester table)
-- ---------------------------------------------------------------------------

ALTER TABLE public."AcademicSequence" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AcademicSequence_select_tenant" ON public."AcademicSequence";
CREATE POLICY "AcademicSequence_select_tenant" ON public."AcademicSequence"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "AcademicSequence_insert_admin" ON public."AcademicSequence";
CREATE POLICY "AcademicSequence_insert_admin" ON public."AcademicSequence"
  FOR INSERT TO authenticated
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin());

DROP POLICY IF EXISTS "AcademicSequence_update_admin" ON public."AcademicSequence";
CREATE POLICY "AcademicSequence_update_admin" ON public."AcademicSequence"
  FOR UPDATE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin())
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin());

DROP POLICY IF EXISTS "AcademicSequence_delete_admin" ON public."AcademicSequence";
CREATE POLICY "AcademicSequence_delete_admin" ON public."AcademicSequence"
  FOR DELETE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin());
