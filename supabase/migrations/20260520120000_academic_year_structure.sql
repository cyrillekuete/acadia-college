-- Per-academic-year structure: configurable terms and sequences (defaults: Cameroon 3/2/6).

ALTER TABLE public."AcademicYear"
  ADD COLUMN IF NOT EXISTS "termsPerYear" integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "sequencesPerTerm" integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "sequencesPerYear" integer NOT NULL DEFAULT 6;

UPDATE public."AcademicYear"
SET
  "termsPerYear" = 3,
  "sequencesPerTerm" = 2,
  "sequencesPerYear" = 6
WHERE "termsPerYear" IS NULL
   OR "sequencesPerTerm" IS NULL
   OR "sequencesPerYear" IS NULL;

ALTER TABLE public."AcademicYear"
  ADD CONSTRAINT "AcademicYear_termsPerYear_check"
  CHECK ("termsPerYear" >= 1 AND "termsPerYear" <= 12);

ALTER TABLE public."AcademicYear"
  ADD CONSTRAINT "AcademicYear_sequencesPerTerm_check"
  CHECK ("sequencesPerTerm" >= 1 AND "sequencesPerTerm" <= 6);

ALTER TABLE public."AcademicYear"
  ADD CONSTRAINT "AcademicYear_sequencesPerYear_check"
  CHECK ("sequencesPerYear" >= 1 AND "sequencesPerYear" <= 24);

-- Relax Term / AcademicSequence fixed Cameroon limits (app validates per year).
ALTER TABLE public."Term" DROP CONSTRAINT IF EXISTS "Term_number_check";

ALTER TABLE public."Term"
  ADD CONSTRAINT "Term_number_check" CHECK (number >= 1 AND number <= 12);

ALTER TABLE public."AcademicSequence" DROP CONSTRAINT IF EXISTS "AcademicSequence_number_check";

ALTER TABLE public."AcademicSequence"
  ADD CONSTRAINT "AcademicSequence_number_check" CHECK (number >= 1 AND number <= 24);

ALTER TABLE public."AcademicSequence" DROP CONSTRAINT IF EXISTS "AcademicSequence_numberInTerm_check";

ALTER TABLE public."AcademicSequence"
  ADD CONSTRAINT "AcademicSequence_numberInTerm_check"
  CHECK ("numberInTerm" >= 1 AND "numberInTerm" <= 6);
