-- Promotion edge cases: enrollment uniqueness, decision linkage, target class, policy staleness

-- Dedupe ENROLLED enrollments per student/year before unique index (keep newest)
DELETE FROM "StudentEnrollment" se
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "tenantId", "studentProfileId", "academicYearId"
        ORDER BY "updatedAt" DESC, "createdAt" DESC
      ) AS rn
    FROM "StudentEnrollment"
    WHERE status = 'ENROLLED'
  ) ranked
  WHERE rn > 1
) dupes
WHERE se.id = dupes.id;

CREATE UNIQUE INDEX IF NOT EXISTS "StudentEnrollment_tenant_student_year_enrolled_uidx"
  ON "StudentEnrollment" ("tenantId", "studentProfileId", "academicYearId")
  WHERE status = 'ENROLLED';

ALTER TABLE "StudentPromotionDecision"
  ADD COLUMN IF NOT EXISTS "enrollmentId" text REFERENCES "StudentEnrollment"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "targetClassId" text,
  ADD COLUMN IF NOT EXISTS "policyStaleAt" timestamptz;

ALTER TABLE "StudentPromotionDecision"
  DROP CONSTRAINT IF EXISTS "StudentPromotionDecision_targetClassId_tenantId_fkey";

ALTER TABLE "StudentPromotionDecision"
  ADD CONSTRAINT "StudentPromotionDecision_targetClassId_tenantId_fkey"
  FOREIGN KEY ("tenantId", "targetClassId")
  REFERENCES "Class" ("tenantId", "id")
  ON DELETE SET NULL;

ALTER TABLE "Level"
  ADD COLUMN IF NOT EXISTS "isDefaultPromotionTarget" boolean NOT NULL DEFAULT false;
