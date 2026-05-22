-- Per-class grouping override on class–subject assignments.

ALTER TABLE public."ClassSubject"
  ADD COLUMN IF NOT EXISTS "groupingId" text;

ALTER TABLE public."ClassSubject"
  DROP CONSTRAINT IF EXISTS "ClassSubject_groupingId_tenantId_fkey";

ALTER TABLE public."ClassSubject"
  ADD CONSTRAINT "ClassSubject_groupingId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "groupingId")
    REFERENCES public."SubjectGrouping"("tenantId", id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "ClassSubject_groupingId_tenantId_idx"
  ON public."ClassSubject" ("tenantId", "groupingId");
