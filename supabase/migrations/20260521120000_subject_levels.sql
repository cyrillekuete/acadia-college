-- Many-to-many: subjects can apply to multiple levels (Subject.levelId remains primary).

CREATE TABLE IF NOT EXISTS public."SubjectLevel" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "subjectId" text NOT NULL,
  "levelId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubjectLevel_pkey" PRIMARY KEY (id),
  CONSTRAINT "SubjectLevel_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "SubjectLevel_tenantId_subjectId_levelId_key"
    UNIQUE ("tenantId", "subjectId", "levelId"),
  CONSTRAINT "SubjectLevel_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SubjectLevel_subjectId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "subjectId")
    REFERENCES public."Subject"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "SubjectLevel_levelId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "levelId")
    REFERENCES public."Level"("tenantId", id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "SubjectLevel_tenantId_levelId_idx"
  ON public."SubjectLevel" ("tenantId", "levelId");

CREATE INDEX IF NOT EXISTS "SubjectLevel_tenantId_subjectId_idx"
  ON public."SubjectLevel" ("tenantId", "subjectId");

INSERT INTO public."SubjectLevel" (id, "tenantId", "subjectId", "levelId", "createdAt")
SELECT
  'sl_' || substr(md5(s.id || ':' || s."levelId" || ':' || s."tenantId"), 1, 20),
  s."tenantId",
  s.id,
  s."levelId",
  COALESCE(s."createdAt", CURRENT_TIMESTAMP)
FROM public."Subject" s
WHERE s."levelId" IS NOT NULL
ON CONFLICT ("tenantId", "subjectId", "levelId") DO NOTHING;
