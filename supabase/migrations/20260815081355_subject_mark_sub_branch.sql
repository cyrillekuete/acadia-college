-- Optional per-sub-branch marks on SubjectMark.

ALTER TABLE public."SubjectMark"
  ADD COLUMN IF NOT EXISTS "subjectSubBranchId" text;

ALTER TABLE public."SubjectMark"
  DROP CONSTRAINT IF EXISTS "SubjectMark_subjectSubBranchId_tenantId_fkey";

ALTER TABLE public."SubjectMark"
  ADD CONSTRAINT "SubjectMark_subjectSubBranchId_tenantId_fkey"
  FOREIGN KEY ("tenantId", "subjectSubBranchId")
  REFERENCES public."SubjectSubBranch"("tenantId", id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "SubjectMark_tenantId_subjectSubBranchId_idx"
  ON public."SubjectMark" ("tenantId", "subjectSubBranchId");

DROP INDEX IF EXISTS public."SubjectMark_session_student_subject_idx";
CREATE UNIQUE INDEX "SubjectMark_session_student_subject_idx"
  ON public."SubjectMark" ("tenantId", "examSessionId", "studentProfileId", "subjectId")
  WHERE "subjectSubBranchId" IS NULL;

DROP INDEX IF EXISTS public."SubjectMark_session_student_subject_branch_idx";
CREATE UNIQUE INDEX "SubjectMark_session_student_subject_branch_idx"
  ON public."SubjectMark" ("tenantId", "examSessionId", "studentProfileId", "subjectId", "subjectSubBranchId")
  WHERE "subjectSubBranchId" IS NOT NULL;
