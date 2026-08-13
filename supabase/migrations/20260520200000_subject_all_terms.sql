-- Subjects can apply to all terms in an academic year (termId NULL).

ALTER TABLE public."Subject"
  ADD COLUMN IF NOT EXISTS "academicYearId" text;

UPDATE public."Subject" sub
SET "academicYearId" = term."academicYearId"
FROM public."Term" term
WHERE sub."termId" = term.id
  AND sub."academicYearId" IS NULL;

ALTER TABLE public."Subject"
  ALTER COLUMN "termId" DROP NOT NULL;

ALTER TABLE public."Subject"
  DROP CONSTRAINT IF EXISTS "Subject_academicYearId_tenantId_fkey";

ALTER TABLE public."Subject"
  ADD CONSTRAINT "Subject_academicYearId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "academicYearId")
    REFERENCES public."AcademicYear"("tenantId", id)
    ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "Subject_tenantId_academicYearId_idx"
  ON public."Subject" ("tenantId", "academicYearId");
