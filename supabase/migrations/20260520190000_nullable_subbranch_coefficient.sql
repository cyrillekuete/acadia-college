-- Sub-branch coefficients are optional; NULL means inherit from the parent subject.

ALTER TABLE public."SubjectSubBranch"
  ALTER COLUMN coefficient DROP NOT NULL,
  ALTER COLUMN coefficient DROP DEFAULT;

ALTER TABLE public."SubjectSubBranch"
  DROP CONSTRAINT IF EXISTS "SubjectSubBranch_coefficient_check";

ALTER TABLE public."SubjectSubBranch"
  ADD CONSTRAINT "SubjectSubBranch_coefficient_check"
  CHECK (coefficient IS NULL OR coefficient > 0::numeric);
