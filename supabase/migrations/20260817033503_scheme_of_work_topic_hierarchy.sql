-- Nested scheme-of-work topics (parent + one level of sub-topics).
-- Term/week grouping is removed; existing topics become roots.

ALTER TABLE public."SchemeOfWorkTopic"
  ADD COLUMN IF NOT EXISTS "parentTopicId" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchemeOfWorkTopic_parentTopicId_tenantId_fkey'
  ) THEN
    ALTER TABLE public."SchemeOfWorkTopic"
      ADD CONSTRAINT "SchemeOfWorkTopic_parentTopicId_tenantId_fkey"
      FOREIGN KEY ("tenantId", "parentTopicId")
      REFERENCES public."SchemeOfWorkTopic"("tenantId", id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchemeOfWorkTopic_parent_not_self'
  ) THEN
    ALTER TABLE public."SchemeOfWorkTopic"
      ADD CONSTRAINT "SchemeOfWorkTopic_parent_not_self"
      CHECK ("parentTopicId" IS NULL OR "parentTopicId" <> id);
  END IF;
END $$;

DROP INDEX IF EXISTS public."SchemeOfWorkTopic_scheme_term_week_idx";

ALTER TABLE public."SchemeOfWorkTopic"
  DROP CONSTRAINT IF EXISTS "SchemeOfWorkTopic_weekNumber_check";

ALTER TABLE public."SchemeOfWorkTopic"
  DROP CONSTRAINT IF EXISTS "SchemeOfWorkTopic_termId_tenantId_fkey";

ALTER TABLE public."SchemeOfWorkTopic"
  DROP COLUMN IF EXISTS "termId",
  DROP COLUMN IF EXISTS "weekNumber";

CREATE INDEX IF NOT EXISTS "SchemeOfWorkTopic_scheme_parent_sort_idx"
  ON public."SchemeOfWorkTopic" ("tenantId", "schemeOfWorkId", "parentTopicId", "sortOrder");
